-- Blink — public profile onboarding.
--
-- Adds the optional Instagram profile URL and an explicit completion marker.
--
-- Completion is stored rather than inferred from "are the fields filled in",
-- because those two are not the same question: a user can legitimately finish
-- onboarding while leaving the optional fields empty, and inferring would keep
-- re-prompting them forever.

alter table public.blink_profiles
  add column if not exists instagram_url text;

comment on column public.blink_profiles.instagram_url is
  'Optional. When present, public profiles show a "View Instagram" button. Absent = no button.';

-- Only real Instagram profile links. Anything else is rejected rather than
-- rendered as a button that leads somewhere unexpected.
alter table public.blink_profiles
  drop constraint if exists blink_profiles_instagram_url_format;
alter table public.blink_profiles
  add constraint blink_profiles_instagram_url_format
  check (
    instagram_url is null
    or instagram_url ~* '^https://(www\.)?instagram\.com/[A-Za-z0-9._]{1,30}/?$'
  );

alter table public.blink_profiles
  add column if not exists onboarded_at timestamptz;

comment on column public.blink_profiles.onboarded_at is
  'Set when the user completes onboarding. Null means the app should show the onboarding flow instead of empty stats.';

-- ---------------------------------------------------------------------------
-- Expose on the leaderboard so a row can link out and open a public profile
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
  bp.instagram_url,
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

comment on view public.leaderboard is
  'Global and per-category standings. Ordered purely by Blink Score, so a small account can outrank a famous one. Only opted-in profiles with at least one verified analysis appear.';
