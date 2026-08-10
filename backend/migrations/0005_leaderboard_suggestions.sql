-- ---------------------------------------------------------------------------
-- Blink — leaderboard suggestions
-- ---------------------------------------------------------------------------
--
-- Backs the "Add someone" action in Ranks.
--
-- A suggestion is NOT an analysis. Nothing here produces a score, spends a
-- credit or touches `blink_profiles`. It records that a user thinks a handle
-- belongs on the board; curation is a separate, manual step.
--
-- Apply in the Supabase SQL editor. The client already tolerates its absence:
-- `leaderboard-suggestions.ts` maps PostgREST's `42P01` to a `needs-setup`
-- result, so the flow works end to end before this runs — the confirmation
-- just says suggestions are reviewed rather than claiming a row was written.
-- ---------------------------------------------------------------------------

create table if not exists public.leaderboard_suggestions (
  id uuid primary key default gen_random_uuid(),

  -- Lowercase, no leading @. Normalised client-side by `normaliseHandle`,
  -- and again here so a direct insert can't bypass it.
  handle text not null check (handle ~ '^[a-z0-9](?:[a-z0-9._]{0,28}[a-z0-9])?$'),

  -- Free text, why this profile belongs on the board.
  note text check (note is null or char_length(note) <= 140),

  -- Storage path of the screenshot, when one is kept. Null today: the client
  -- does not upload the capture yet, because the handle is the only part
  -- curation actually needs and storing other people's screenshots is a
  -- privacy cost with no current benefit. The column exists so adding it
  -- later is not a migration.
  evidence_path text,

  -- Whether the handle was read off the image or typed. Curation can weight
  -- detected handles differently — they came from a real capture.
  source text not null default 'typed' check (source in ('detected', 'typed')),

  -- Null for signed-out suggestions, which are allowed.
  suggested_by uuid references auth.users (id) on delete set null,

  -- Set by whoever reviews it. Nothing reads this yet.
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),

  created_at timestamptz not null default now()
);

-- One suggestion per handle per person. A second attempt returns 23505, which
-- the client shows as "already suggested" rather than as an error — the user
-- did nothing wrong.
create unique index if not exists leaderboard_suggestions_unique
  on public.leaderboard_suggestions (handle, coalesce(suggested_by, '00000000-0000-0000-0000-000000000000'::uuid));

create index if not exists leaderboard_suggestions_pending
  on public.leaderboard_suggestions (created_at desc)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
--
-- Anyone may suggest. Nobody may read the list back through the API: it is a
-- queue of other people's handles, and exposing it would turn a curation
-- table into a public directory. Review happens in the SQL editor or through
-- the service role, both of which bypass RLS.
-- ---------------------------------------------------------------------------

alter table public.leaderboard_suggestions enable row level security;

drop policy if exists "anyone can suggest" on public.leaderboard_suggestions;
create policy "anyone can suggest"
  on public.leaderboard_suggestions
  for insert
  with check (
    -- A signed-in user may only attribute a suggestion to themselves.
    suggested_by is null or suggested_by = auth.uid()
  );

drop policy if exists "authors can see their own" on public.leaderboard_suggestions;
create policy "authors can see their own"
  on public.leaderboard_suggestions
  for select
  using (suggested_by is not null and suggested_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Reviewing the queue
-- ---------------------------------------------------------------------------
--
--   select handle, count(*) as votes, max(created_at) as latest
--   from public.leaderboard_suggestions
--   where status = 'pending'
--   group by handle
--   order by votes desc, latest desc;
--
-- Accepting one is a manual decision — create or claim the profile, then:
--
--   update public.leaderboard_suggestions
--   set status = 'accepted'
--   where handle = '<handle>';
-- ---------------------------------------------------------------------------
