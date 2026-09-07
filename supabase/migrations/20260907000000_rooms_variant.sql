-- Rooms list layout variant.
--
-- Mirrors `job_titles.home_variant`. Supervisors work the floor from the rooms
-- list, so theirs is grouped by housekeeping status with In Progress pinned to
-- the top (Figma 3838:1117); housekeeping and executive leadership read the
-- flat list. That is a presentation concern, not a right — Senior Supervisor,
-- Supervisor and Coordinator hold exactly the `full_access` permission set the
-- managers above them do, which is why this cannot live on the role.
--
-- Values are seeded from `src/domain/rbac/matrix.json` by
-- `npm run rbac:generate`; this migration only adds the column and the reader.

BEGIN;

ALTER TABLE public.job_titles
  ADD COLUMN IF NOT EXISTS rooms_variant text NOT NULL DEFAULT 'default';

-- Named so a later variant can extend it without guessing the constraint name.
ALTER TABLE public.job_titles
  DROP CONSTRAINT IF EXISTS job_titles_rooms_variant_check;
ALTER TABLE public.job_titles
  ADD CONSTRAINT job_titles_rooms_variant_check
  CHECK (rooms_variant IN ('default', 'supervisor'));

COMMENT ON COLUMN public.job_titles.rooms_variant IS
  'Which Rooms list layout this title sees. Presentation only; see matrix.json.';

-- The caller's rooms layout, alongside get_my_home_variant().
CREATE OR REPLACE FUNCTION public.get_my_rooms_variant() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT coalesce(jt.rooms_variant, 'default')
  FROM public.users u
  LEFT JOIN public.job_titles jt ON jt.id = u.job_title_id
  WHERE u.id = auth.uid();
$$;

ALTER FUNCTION public.get_my_rooms_variant() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_my_rooms_variant() TO authenticated;

COMMIT;
