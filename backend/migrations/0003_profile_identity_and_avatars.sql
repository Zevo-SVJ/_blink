-- Blink — public profile identity: avatar, country, Instagram handle.
--
-- Adds the fields a leaderboard row needs to be recognisable, and a storage
-- bucket for user-chosen profile pictures.
--
-- Avatars live in Storage rather than as data URIs in `blink_profiles`,
-- because the leaderboard selects many rows at once and inlining images would
-- put megabytes of base64 into every board query.

-- ---------------------------------------------------------------------------
-- Identity columns
-- ---------------------------------------------------------------------------

alter table public.blink_profiles
  add column if not exists country text;

-- Rank movement needs a previous position to compare against. Ranks are
-- derived (a window function over scores), so they have to be snapshotted to
-- be comparable over time. Null means "no snapshot yet", which the UI shows as
-- "—" rather than inventing a movement.
alter table public.blink_profiles
  add column if not exists previous_rank integer;

alter table public.blink_profiles
  add column if not exists ranked_at timestamptz;

comment on column public.blink_profiles.country is
  'ISO 3166-1 alpha-2, uppercase. Rendered as a flag on leaderboard rows.';

-- Two letters, or nothing. Keeps flag rendering total.
alter table public.blink_profiles
  drop constraint if exists blink_profiles_country_format;
alter table public.blink_profiles
  add constraint blink_profiles_country_format
  check (country is null or country ~ '^[A-Z]{2}$');

-- Instagram handles: letters, digits, dots, underscores, max 30.
alter table public.blink_profiles
  drop constraint if exists blink_profiles_handle_format;
alter table public.blink_profiles
  add constraint blink_profiles_handle_format
  check (handle is null or handle ~ '^[A-Za-z0-9._]{1,30}$');

-- ---------------------------------------------------------------------------
-- Avatar storage
-- ---------------------------------------------------------------------------

-- Public bucket: leaderboard rows are public, so the images must be too.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Objects are stored at `<user-id>/avatar.jpg`, so ownership is the first
-- path segment. A user can only write within their own folder.
drop policy if exists "avatars are publicly readable" on storage.objects;
create policy "avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "users manage their own avatar" on storage.objects;
create policy "users manage their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users update their own avatar" on storage.objects;
create policy "users update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users delete their own avatar" on storage.objects;
create policy "users delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- Expose the new column on the leaderboard
-- ---------------------------------------------------------------------------

create or replace view public.leaderboard
with (security_invoker = true)
as
select
  bp.id,
  bp.handle,
  bp.display_name,
  bp.avatar_url,
  bp.country,
  bp.score,
  bp.peak_score,
  bp.category,
  bp.streak,
  bp.verified_count,
  bp.last_verified_at,
  bp.previous_rank,
  rank() over (order by bp.score desc, bp.last_verified_at asc) as rank,
  rank() over (partition by bp.category order by bp.score desc, bp.last_verified_at asc) as category_rank,
  -- Positive = climbed. Null until a snapshot exists, so the UI can show "—"
  -- instead of implying a profile has held still.
  case
    when bp.previous_rank is null then null
    else bp.previous_rank - rank() over (order by bp.score desc, bp.last_verified_at asc)
  end as movement
from public.blink_profiles bp
where bp.is_public
  and bp.verified_count > 0;

-- ---------------------------------------------------------------------------
-- Rank snapshots
-- ---------------------------------------------------------------------------

/*
 * Freeze the current standings into `previous_rank`.
 *
 * Run this on whatever cadence movement should reflect — weekly alongside the
 * winner rollup is the intent. Everything after the next call is measured
 * against this moment.
 */
create or replace function public.snapshot_leaderboard_ranks()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with current_ranks as (
    select
      bp.id,
      rank() over (order by bp.score desc, bp.last_verified_at asc) as r
    from public.blink_profiles bp
    where bp.is_public and bp.verified_count > 0
  )
  update public.blink_profiles bp
     set previous_rank = cr.r,
         ranked_at     = now()
    from current_ranks cr
   where cr.id = bp.id;
end;
$$;

comment on view public.leaderboard is
  'Global and per-category standings. Ordered purely by Blink Score, so a small account can outrank a famous one.';
