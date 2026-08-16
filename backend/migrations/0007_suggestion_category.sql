-- ---------------------------------------------------------------------------
-- Blink — remember which board a suggested profile belongs on.
-- ---------------------------------------------------------------------------
--
-- "Add someone" asks for a handle and now also for a category, so the person
-- lands on the right board rather than in an uncategorised pile. That answer
-- needs somewhere to live.
--
-- Deliberately plain `text` rather than an enum or a CHECK against the current
-- category list: the canonical list is defined in `web-blink/src/lib/categories.ts`
-- and is expected to change. A constraint here would mean a migration every
-- time a category is added, and a failed insert for anyone running an older
-- client. The client canonicalises on the way in *and* on the way out
-- (`normaliseCategory`), so a value that is not a real board can never be
-- displayed as one.
--
-- Null is meaningful: a suggestion made before this column existed, or by a
-- client that could not offer the picker.
--
-- Apply in the Supabase SQL editor. Until it runs, `suggestProfile` detects
-- the missing column (PostgREST `42703`) and retries without it, so the flow
-- keeps working and only the category is lost.
-- ---------------------------------------------------------------------------

alter table public.leaderboard_suggestions
  add column if not exists category text;

comment on column public.leaderboard_suggestions.category is
  'Canonical Blink category id chosen by the suggester. Null when unknown. Not constrained here on purpose — see the migration header.';
