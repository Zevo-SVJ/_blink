-- ---------------------------------------------------------------------------
-- Blink — clear test profiles off the visible leaderboard
-- ---------------------------------------------------------------------------
--
-- Run this in the Supabase SQL Editor when the board is full of profiles from
-- testing and you want it empty and ready for curated ones.
--
-- WHY THIS IS NOT A DELETE
--
-- The `leaderboard` view is defined as:
--
--     from public.blink_profiles bp
--     where bp.is_public and bp.verified_count > 0
--
-- so visibility is already a per-profile flag. Flipping `is_public` to false
-- takes a profile off every board — global, category, weekly winners — while
-- leaving the row, its score history, its analyses and its rank machinery
-- untouched. Nothing about the ranking system changes; the population it
-- ranks does. That means this is reversible in one statement, and it cannot
-- orphan a foreign key or break a user's own account.
--
-- Deleting the rows would take their analyses with them, break the streak and
-- momentum calculations that read score history, and sign those users out of
-- their own data. Don't.
--
-- This script is intentionally NOT a migration. Migrations describe schema,
-- and this is a one-off data decision about your particular project — running
-- it automatically on a fresh environment would be wrong.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 1. Look first. This is exactly who is currently visible.
-- ---------------------------------------------------------------------------

select
  id,
  handle,
  display_name,
  score,
  category,
  verified_count,
  last_verified_at
from public.leaderboard
order by score desc;


-- ---------------------------------------------------------------------------
-- 2. Hide them.
-- ---------------------------------------------------------------------------
--
-- Put the ids you want to KEEP on the board in the `keep` list below — your own
-- account, at minimum, if you want to stay ranked. Everything else currently
-- visible gets hidden.
--
-- Uncomment to run.
-- ---------------------------------------------------------------------------

-- with keep (id) as (
--   values
--     -- ('00000000-0000-0000-0000-000000000000'::uuid)
--     (null::uuid)
-- )
-- update public.blink_profiles
-- set is_public = false,
--     updated_at = now()
-- where is_public
--   and verified_count > 0
--   and id not in (select id from keep where id is not null);


-- ---------------------------------------------------------------------------
-- 3. Confirm the board is empty.
-- ---------------------------------------------------------------------------

-- select count(*) as still_visible from public.leaderboard;


-- ---------------------------------------------------------------------------
-- 4. Undo, if you hid something you meant to keep.
-- ---------------------------------------------------------------------------
--
-- Per profile:
--
--   update public.blink_profiles
--   set is_public = true, updated_at = now()
--   where id = '<uuid>';
--
-- There is deliberately no bulk undo: after step 2 the flag no longer
-- distinguishes "hidden by this script" from "user chose to be private", and
-- flipping everyone back to public would override a real privacy choice.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 5. Optional — reset movement arrows.
-- ---------------------------------------------------------------------------
--
-- `previous_rank` still holds positions from the old population, so the first
-- profiles on the new board would show movement against people who are no
-- longer there. Clearing it makes the UI show "—" until the next snapshot,
-- which is the honest state.
--
--   update public.blink_profiles set previous_rank = null where previous_rank is not null;
--
-- Then take a fresh baseline once real profiles are in:
--
--   select public.snapshot_leaderboard_ranks();
-- ---------------------------------------------------------------------------
