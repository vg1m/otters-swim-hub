-- Migration: Fix Security Definer View (ERROR)
-- Prior migrations 033 and 038 dropped and recreated this view but omitted
-- WITH (security_invoker = true), so the view still ran with the view owner's
-- (postgres) permissions. Adding security_invoker = true makes the view use
-- the querying user's permissions and RLS, resolving the Supabase lint error.

DROP VIEW IF EXISTS public.orphaned_registrations_summary CASCADE;

CREATE VIEW public.orphaned_registrations_summary
WITH (security_invoker = true)
AS
SELECT
  i.id                                           AS invoice_id,
  i.total_amount,
  i.status                                       AS invoice_status,
  i.created_at                                   AS invoice_created_at,
  p.callback_data->>'parentEmail'                AS parent_email,
  p.callback_data->'parentData'->>'full_name'    AS parent_name,
  p.callback_data->'parentData'->>'phone_number' AS parent_phone,
  COUNT(DISTINCT s.id)                           AS swimmer_count,
  ARRAY_AGG(DISTINCT s.first_name || ' ' || s.last_name)
    FILTER (WHERE s.id IS NOT NULL)              AS swimmer_names,
  ARRAY_AGG(DISTINCT s.id)
    FILTER (WHERE s.id IS NOT NULL)              AS swimmer_ids
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
LEFT JOIN swimmers s ON s.parent_id IS NULL
  AND s.id IN (
    SELECT jsonb_array_elements_text(p2.callback_data->'swimmers')::UUID
    FROM payments p2
    WHERE p2.invoice_id = i.id
      AND p2.callback_data ? 'swimmers'
  )
WHERE i.parent_id IS NULL
GROUP BY i.id, i.total_amount, i.status, i.created_at, p.callback_data;

GRANT SELECT ON public.orphaned_registrations_summary TO authenticated;
GRANT SELECT ON public.orphaned_registrations_summary TO service_role;

COMMENT ON VIEW public.orphaned_registrations_summary IS
  'Admin view for orphaned registrations. Uses security_invoker=true so the querying user''s RLS is enforced rather than the view owner''s permissions.';
