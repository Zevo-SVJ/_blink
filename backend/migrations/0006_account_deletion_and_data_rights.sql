-- ---------------------------------------------------------------------------
-- Blink — make "delete my account" actually delete the account.
-- ---------------------------------------------------------------------------
--
-- ## The bug this fixes
--
-- Settings offered "Delete your Blink account and all associated data". What
-- it ran was a delete against `public.profiles` and nothing else. Everything
-- that actually describes a person survived it:
--
--   * `analyses`      — the written analyses, including handles read off
--                       other people's profiles
--   * `score_history` — the score trail and the screenshot fingerprints
--   * `blink_profiles`— the public profile, which stayed on the leaderboard
--   * `storage.objects` — the uploaded avatar, in a public bucket
--   * `auth.users`    — the login itself, with the email address
--
-- Worse, two of those could not be deleted from the client at all: RLS on
-- `score_history` and `blink_profiles` grants select/insert/update and no
-- delete, so the rows were unreachable by the only party entitled to erase
-- them. A right to erasure that the database refuses is not a right.
--
-- ## The fix
--
-- One SECURITY DEFINER function that erases everything belonging to the
-- caller, in one transaction, and the missing delete policies so a user can
-- also remove individual records without invoking the whole thing.
--
-- ## Deployment note (important)
--
-- `delete_my_account` removes the row from `auth.users` as its last step, so
-- the account is genuinely gone rather than orphaned. That requires the
-- function to be owned by a role with rights on the auth schema — running
-- this file in the Supabase SQL editor gives it `postgres`, which does.
--
-- If your deployment cannot grant that, comment out the final delete: the
-- function still erases every application table, and the client already tells
-- the user, honestly, that the login record is removed separately. Do not
-- instead leave the button claiming a full deletion it did not perform.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Missing delete policies
-- ---------------------------------------------------------------------------

alter table public.score_history  enable row level security;
alter table public.blink_profiles enable row level security;

-- Erasure of your own score trail. Also what lets a user drop the screenshot
-- fingerprints without deleting the whole account.
drop policy if exists "score_history self delete" on public.score_history;
create policy "score_history self delete"
  on public.score_history for delete
  using (auth.uid() = user_id);

-- Leaving the leaderboard entirely, rather than only toggling `is_public`.
drop policy if exists "blink_profiles self delete" on public.blink_profiles;
create policy "blink_profiles self delete"
  on public.blink_profiles for delete
  using (auth.uid() = id);

-- `analyses` has carried a self-delete policy since the table was created;
-- this re-asserts it so a fresh environment cannot come up without one.
alter table public.analyses enable row level security;

drop policy if exists "analyses self delete" on public.analyses;
create policy "analyses self delete"
  on public.analyses for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Assert the boundaries the app relies on
-- ---------------------------------------------------------------------------
--
-- `analyses` and `profiles` were created outside this migrations directory, so
-- their policies are not reviewable here — and `profiles` holds email
-- addresses. Rather than assume, the intended rules are restated below.
--
-- Every statement is idempotent and none of them widens access: each one is
-- "this row is readable and writable by the user it belongs to, and by nobody
-- else". If the live policies already say that, this changes nothing. If a
-- policy is missing, or was left permissive during development, this is what
-- closes it — which matters most for `profiles`, where the failure mode is a
-- readable list of every user's email address.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles self delete" on public.profiles;
create policy "profiles self delete"
  on public.profiles for delete
  using (auth.uid() = id);

-- Analyses are private to their author. A third-party read is written *about*
-- someone else but is never readable *by* them, or by anyone else.
drop policy if exists "analyses self read" on public.analyses;
create policy "analyses self read"
  on public.analyses for select
  using (auth.uid() = user_id);

drop policy if exists "analyses self insert" on public.analyses;
create policy "analyses self insert"
  on public.analyses for insert
  with check (auth.uid() = user_id);

drop policy if exists "analyses self update" on public.analyses;
create policy "analyses self update"
  on public.analyses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Erase everything belonging to the caller
-- ---------------------------------------------------------------------------

/*
 * Deletes the caller's account and all associated data.
 *
 * SECURITY DEFINER so it can reach `storage.objects` and `auth.users`, but it
 * derives the subject from `auth.uid()` and never from an argument — there is
 * no parameter to point at somebody else's account. An unauthenticated call
 * raises rather than deleting anything.
 *
 * Order matters only for the last step: `auth.users` cascades to the tables
 * that reference it, so the explicit deletes above it are what guarantee the
 * data is gone even in a deployment where the final delete is commented out.
 */
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'delete_my_account: no authenticated user';
  end if;

  -- Suggestions are kept but disowned: the handle someone proposed for the
  -- leaderboard is not personal data about the person who proposed it once
  -- the link to them is gone, and the FK is already `on delete set null`.
  update public.leaderboard_suggestions
     set suggested_by = null
   where suggested_by = uid;

  delete from public.score_history  where user_id = uid;
  delete from public.analyses       where user_id = uid;
  delete from public.weekly_winners where user_id = uid;
  delete from public.blink_profiles where id      = uid;

  -- The avatar lives at `<user-id>/…` in a public bucket, so leaving it would
  -- leave a publicly readable photograph of a deleted user.
  delete from storage.objects
   where bucket_id = 'avatars'
     and (storage.foldername(name))[1] = uid::text;

  delete from public.profiles where id = uid;

  -- The login itself. See the deployment note at the top of this file.
  delete from auth.users where id = uid;
end;
$$;

comment on function public.delete_my_account is
  'Erases the calling user''s account and every row associated with it. Subject comes from auth.uid(); there is no way to aim it at another account.';

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
