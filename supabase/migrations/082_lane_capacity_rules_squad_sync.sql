-- Lane capacity rules follow squad slugs (sub_squad = squads.slug).

-- Backfill active squads; drop rules for squads that no longer exist
DELETE FROM public.lane_capacity_rules l
WHERE NOT EXISTS (
  SELECT 1 FROM public.squads s WHERE s.slug = l.sub_squad AND s.is_active = true
);

INSERT INTO public.lane_capacity_rules (sub_squad, swimmers_per_lane)
SELECT s.slug, 6
FROM public.squads s
WHERE s.is_active = true
ON CONFLICT (sub_squad) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_lane_capacity_rule_for_squad()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.lane_capacity_rules (sub_squad, swimmers_per_lane)
  VALUES (NEW.slug, 6)
  ON CONFLICT (sub_squad) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS squads_ensure_lane_capacity_rule ON public.squads;
CREATE TRIGGER squads_ensure_lane_capacity_rule
  AFTER INSERT ON public.squads
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_lane_capacity_rule_for_squad();

CREATE OR REPLACE FUNCTION public.remove_lane_capacity_rule_for_squad()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.lane_capacity_rules WHERE sub_squad = OLD.slug;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS squads_remove_lane_capacity_rule ON public.squads;
CREATE TRIGGER squads_remove_lane_capacity_rule
  AFTER DELETE ON public.squads
  FOR EACH ROW
  EXECUTE FUNCTION public.remove_lane_capacity_rule_for_squad();

COMMENT ON FUNCTION public.ensure_lane_capacity_rule_for_squad() IS
  'Auto-insert lane_capacity_rules row when a new squad is created (sub_squad = slug).';
