-- Back office Step 5.2 (tickets page): two gaps the page found.
--
-- 1. resolved_at follows the status, whoever writes it. Mobile only writes
--    `status`, so a ticket closed on a phone had no resolution time (the
--    list's Resolved column, and later the tickets report, need one).
--    Done (or the legacy closed / resolved): stamped when it becomes done and
--    kept while it stays done. Anything else: cleared, so Reopen starts over.
-- 2. Tags could be added but never removed (ticket_tags had no DELETE policy).
--    Whoever added the tag, the ticket's author, or tickets.manage may remove it.

CREATE OR REPLACE FUNCTION public._tickets_resolved_stamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_done boolean := lower(coalesce(NEW.status, '')) IN ('done', 'closed', 'resolved');
BEGIN
  IF NOT v_done THEN
    NEW.resolved_at := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.resolved_at := coalesce(NEW.resolved_at, now());
  ELSIF lower(coalesce(OLD.status, '')) NOT IN ('done', 'closed', 'resolved') THEN
    NEW.resolved_at := now();
  ELSE
    NEW.resolved_at := coalesce(NEW.resolved_at, OLD.resolved_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_resolved_stamp ON public.tickets;
CREATE TRIGGER tickets_resolved_stamp
  BEFORE INSERT OR UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public._tickets_resolved_stamp();

-- Existing rows: done without a time get their last update; open ones lose a stale time.
UPDATE public.tickets
   SET resolved_at = coalesce(updated_at, created_at)
 WHERE lower(status) IN ('done', 'closed', 'resolved') AND resolved_at IS NULL;
UPDATE public.tickets
   SET resolved_at = NULL
 WHERE lower(status) NOT IN ('done', 'closed', 'resolved') AND resolved_at IS NOT NULL;

DROP POLICY IF EXISTS "Taggers, authors and managers can remove ticket tags" ON public.ticket_tags;
CREATE POLICY "Taggers, authors and managers can remove ticket tags"
  ON public.ticket_tags FOR DELETE TO authenticated
  USING (
    hotel_id = (SELECT public.auth_hotel_id())
    AND (
      tagged_by_id = (SELECT auth.uid())
      OR (SELECT public.auth_has_permission('tickets.manage'))
      OR EXISTS (
        SELECT 1 FROM public.tickets t
         WHERE t.id = ticket_tags.ticket_id AND t.created_by_id = (SELECT auth.uid())
      )
    )
  );
