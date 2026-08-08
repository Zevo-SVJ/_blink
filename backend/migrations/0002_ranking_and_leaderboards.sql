-- Blink — ranking, progression and leaderboards.
--
-- Design notes:
--   * The ladder measures profile optimisation, never popularity. No follower
--     count, no verification badge, no reach metric is stored or ranked here.
--   * Rank only moves on a verified analysis: a NEW screenshot of the user's
--     OWN profile. `score_history.image_hash` makes re-submitting the same
--     capture a no-op, so opening the app can never manufacture progress.
--   * `blink_profiles` is the denormalised, rankable projection of a user's
--     verified history. It is maintained by trigger, not by the client.

-- ---------------------------------------------------------------------------
-- Ranked profile projection
-- ---------------------------------------------------------------------------

create table if not exists public.blink_profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  handle           text unique,
  display_name     text,
  avatar_url       text,
  -- Opt-in. A user only appears on leaderboards after choosing to.
  is_public        boolean     not null default false,
  score            integer     not null default 0 check (score between 0 and 1000),
  peak_score       integer     not null default 0 check (peak_score between 0 and 1000),
  category         text,
  streak           integer     not null default 0,
  verified_count   integer     not null default 0,
  best_rank        integer,
  last_verified_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.blink_profiles is
  'Rankable projection of a user''s verified Blink history. Optimisation only — never follower count or fame.';

create index if not exists blink_profiles_score_idx
  on public.blink_profiles (score desc, last_verified_at asc)
  where is_public;

create index if not exists blink_profiles_category_score_idx
  on public.blink_profiles (category, score desc, last_verified_at asc)
  where is_public;

-- ---------------------------------------------------------------------------
-- Append-only score history
-- ---------------------------------------------------------------------------

create table if not exists public.score_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  analysis_id uuid        references public.analyses (id) on delete set null,
  score       integer     not null check (score between 0 and 1000),
  category    text,
  -- SHA-256 of the uploaded screenshot. Duplicate of the previous verified
  -- upload => the profile did not actually change => does not count.
  image_hash  text,
  verified    boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists score_history_user_created_idx
  on public.score_history (user_id, created_at desc);

-- One verified entry per distinct screenshot, per user. Belt-and-braces
-- alongside the application-level duplicate check.
create unique index if not exists score_history_user_hash_verified_idx
  on public.score_history (user_id, image_hash)
  where verified and image_hash is not null;

-- ---------------------------------------------------------------------------
-- Weekly winners
-- ---------------------------------------------------------------------------

create table if not exists public.weekly_winners (
  id          uuid primary key default gen_random_uuid(),
  week_start  date        not null,
  -- null category = the overall winner for that week
  category    text,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  score       integer     not null,
  -- Points gained that week. This is what "winning" means: biggest verified
  -- improvement, not the highest absolute score.
  improvement integer     not null default 0,
  created_at  timestamptz not null default now(),
  unique (week_start, category)
);

-- ---------------------------------------------------------------------------
-- Keep the projection in sync with history
-- ---------------------------------------------------------------------------

create or replace function public.refresh_blink_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not new.verified then
    return new;
  end if;

  insert into public.blink_profiles as bp (id, score, peak_score, category, verified_count, last_verified_at, updated_at)
  values (new.user_id, new.score, new.score, new.category, 1, new.created_at, now())
  on conflict (id) do update
    set score            = excluded.score,
        peak_score       = greatest(bp.peak_score, excluded.score),
        category         = coalesce(excluded.category, bp.category),
        verified_count   = bp.verified_count + 1,
        last_verified_at = excluded.last_verified_at,
        updated_at       = now();

  return new;
end;
$$;

drop trigger if exists score_history_refresh_profile on public.score_history;
create trigger score_history_refresh_profile
  after insert on public.score_history
  for each row execute function public.refresh_blink_profile();

-- ---------------------------------------------------------------------------
-- Leaderboards
-- ---------------------------------------------------------------------------

-- security_invoker so the view is filtered by the querying user's RLS rather
-- than the view owner's.
create or replace view public.leaderboard
with (security_invoker = true)
as
select
  bp.id,
  bp.handle,
  bp.display_name,
  bp.avatar_url,
  bp.score,
  bp.peak_score,
  bp.category,
  bp.streak,
  bp.verified_count,
  bp.last_verified_at,
  -- Ties break toward whoever reached the score first.
  rank() over (order by bp.score desc, bp.last_verified_at asc) as rank,
  rank() over (partition by bp.category order by bp.score desc, bp.last_verified_at asc) as category_rank
from public.blink_profiles bp
where bp.is_public
  and bp.verified_count > 0;

comment on view public.leaderboard is
  'Global and per-category standings. Ordered purely by Blink Score, so a small account can outrank a famous one.';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.blink_profiles enable row level security;
alter table public.score_history  enable row level security;
alter table public.weekly_winners enable row level security;

-- Public profiles are readable by anyone (that is the leaderboard); your own
-- row is always readable even while private.
drop policy if exists "blink_profiles readable" on public.blink_profiles;
create policy "blink_profiles readable"
  on public.blink_profiles for select
  using (is_public or auth.uid() = id);

drop policy if exists "blink_profiles self insert" on public.blink_profiles;
create policy "blink_profiles self insert"
  on public.blink_profiles for insert
  with check (auth.uid() = id);

-- Users control presentation and visibility. Score columns are written by the
-- trigger (security definer), so they are not client-writable in practice.
drop policy if exists "blink_profiles self update" on public.blink_profiles;
create policy "blink_profiles self update"
  on public.blink_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "score_history self read" on public.score_history;
create policy "score_history self read"
  on public.score_history for select
  using (auth.uid() = user_id);

drop policy if exists "score_history self insert" on public.score_history;
create policy "score_history self insert"
  on public.score_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "weekly_winners readable" on public.weekly_winners;
create policy "weekly_winners readable"
  on public.weekly_winners for select
  using (true);
