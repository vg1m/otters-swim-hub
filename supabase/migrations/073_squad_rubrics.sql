-- ============================================================
-- Migration 073: Squad Rubrics System
-- ============================================================
-- Adds rubric_domains, rubric_milestones, swimmer_milestone_ratings,
-- and swimmer_attitude_ratings tables, seeds the new squad slugs
-- (dev1–gold), and seeds all milestone data from the rubric document.
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. New squad rows (dev1, dev2, dev3, bronze, silver, gold)
--    Fees set to same as development tier; admins can update later.
-- ---------------------------------------------------------------------------
INSERT INTO public.squads (slug, name, sort_order, monthly_fee, quarterly_fee, early_bird_eligible, description)
VALUES
  ('dev1',   'Development 1', 5,  12000, 30000, true,  'Ages 7–8 · Coach Pauline'),
  ('dev2',   'Development 2', 6,  12000, 30000, true,  'Ages 8–9 · Coach Allan'),
  ('dev3',   'Development 3', 7,  12000, 30000, true,  'Ages 10–11 · Coach Allan'),
  ('bronze', 'Bronze',        8,  12000, 30000, true,  'Ages 11–13 · Coach Shirley'),
  ('silver', 'Silver',        9,  12000, 30000, true,  'Ages 12–14 · Coach Shirley / Coach Savannah'),
  ('gold',   'Gold',          10, 12000, 30000, true,  'By selection · Coach Shirley')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. rubric_domains
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rubric_domains (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_slug  TEXT    NOT NULL,
  section     TEXT    NOT NULL CHECK (section IN ('skills', 'habits')),
  domain_name TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_custom   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rubric_domains_squad_slug ON public.rubric_domains (squad_slug);

ALTER TABLE public.rubric_domains ENABLE ROW LEVEL SECURITY;

-- Everyone can read static rubric structure
CREATE POLICY "Anyone authenticated can read rubric_domains"
  ON public.rubric_domains FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can manage (insert custom domains)
CREATE POLICY "Admins can manage rubric_domains"
  ON public.rubric_domains FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Coaches can insert custom domains
CREATE POLICY "Coaches can insert rubric_domains"
  ON public.rubric_domains FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coach')
    AND is_custom = true
  );

-- ---------------------------------------------------------------------------
-- 3. rubric_milestones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rubric_milestones (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id   UUID    NOT NULL REFERENCES public.rubric_domains(id) ON DELETE CASCADE,
  text        TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_custom   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rubric_milestones_domain_id ON public.rubric_milestones (domain_id);

ALTER TABLE public.rubric_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read rubric_milestones"
  ON public.rubric_milestones FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage rubric_milestones"
  ON public.rubric_milestones FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Coaches can insert custom milestones"
  ON public.rubric_milestones FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coach')
    AND is_custom = true
  );

-- ---------------------------------------------------------------------------
-- 4. swimmer_milestone_ratings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.swimmer_milestone_ratings (
  id           UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  swimmer_id   UUID     NOT NULL REFERENCES public.swimmers(id) ON DELETE CASCADE,
  milestone_id UUID     NOT NULL REFERENCES public.rubric_milestones(id) ON DELETE CASCADE,
  rated_by     UUID     REFERENCES public.profiles(id) ON DELETE SET NULL,
  month_year   DATE     NOT NULL,  -- always stored as first of month, e.g. 2026-05-01
  rating       SMALLINT CHECK (rating BETWEEN 1 AND 4),  -- NULL means N/A (see is_na)
  is_na        BOOLEAN  NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (swimmer_id, milestone_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_smr_swimmer_id   ON public.swimmer_milestone_ratings (swimmer_id);
CREATE INDEX IF NOT EXISTS idx_smr_milestone_id ON public.swimmer_milestone_ratings (milestone_id);
CREATE INDEX IF NOT EXISTS idx_smr_month_year   ON public.swimmer_milestone_ratings (month_year DESC);

CREATE OR REPLACE TRIGGER update_swimmer_milestone_ratings_updated_at
  BEFORE UPDATE ON public.swimmer_milestone_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.swimmer_milestone_ratings ENABLE ROW LEVEL SECURITY;

-- Parents see their own swimmer's ratings
CREATE POLICY "Parents can view own swimmer milestone ratings"
  ON public.swimmer_milestone_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.swimmers s
      WHERE s.id = swimmer_milestone_ratings.swimmer_id
        AND public.auth_user_can_access_parent_data(s.parent_id)
    )
  );

-- Coaches can read all and write
CREATE POLICY "Coaches can view all milestone ratings"
  ON public.swimmer_milestone_ratings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "Coaches can insert milestone ratings"
  ON public.swimmer_milestone_ratings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('coach', 'admin')));

CREATE POLICY "Coaches can update milestone ratings"
  ON public.swimmer_milestone_ratings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('coach', 'admin')));

-- Admins: full
CREATE POLICY "Admins can manage milestone ratings"
  ON public.swimmer_milestone_ratings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 5. swimmer_attitude_ratings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.swimmer_attitude_ratings (
  id            UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  swimmer_id    UUID     NOT NULL REFERENCES public.swimmers(id) ON DELETE CASCADE,
  rated_by      UUID     REFERENCES public.profiles(id) ON DELETE SET NULL,
  month_year    DATE     NOT NULL,
  coach_rating  SMALLINT CHECK (coach_rating BETWEEN 1 AND 5),
  self_rating   SMALLINT CHECK (self_rating BETWEEN 1 AND 5),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (swimmer_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_sar_swimmer_id ON public.swimmer_attitude_ratings (swimmer_id);
CREATE INDEX IF NOT EXISTS idx_sar_month_year ON public.swimmer_attitude_ratings (month_year DESC);

CREATE OR REPLACE TRIGGER update_swimmer_attitude_ratings_updated_at
  BEFORE UPDATE ON public.swimmer_attitude_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.swimmer_attitude_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own swimmer attitude ratings"
  ON public.swimmer_attitude_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.swimmers s
      WHERE s.id = swimmer_attitude_ratings.swimmer_id
        AND public.auth_user_can_access_parent_data(s.parent_id)
    )
  );

CREATE POLICY "Coaches can view all attitude ratings"
  ON public.swimmer_attitude_ratings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "Coaches can insert attitude ratings"
  ON public.swimmer_attitude_ratings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('coach', 'admin')));

CREATE POLICY "Coaches can update attitude ratings"
  ON public.swimmer_attitude_ratings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('coach', 'admin')));

CREATE POLICY "Admins can manage attitude ratings"
  ON public.swimmer_attitude_ratings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 6. Seed all rubric domains and milestones
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  d_id UUID;
BEGIN

  -- ══════════════════════════════════════════════════════
  -- PUPS
  -- ══════════════════════════════════════════════════════

  -- SKILLS
  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('pups', 'skills', 'Water confidence & safety', 1) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Enters the pool without distress', 1),
    (d_id, 'Submerges face and blows bubbles for 3 or more seconds', 2),
    (d_id, 'Front float unassisted for 5 seconds', 3),
    (d_id, 'Back float unassisted for 5 seconds', 4),
    (d_id, 'Turns from front to back and back to front', 5),
    (d_id, 'Safe pool entry and exit (ladder or steps)', 6);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('pups', 'skills', 'Freestyle (introduction)', 2) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Flutter kick with board across the pool', 1),
    (d_id, 'Freestyle arm action with face in water over short distance', 2),
    (d_id, '10m unassisted freestyle', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('pups', 'skills', 'Backstroke (introduction)', 3) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Back kick with board across the pool', 1),
    (d_id, '10m unassisted backstroke', 2);

  -- HABITS
  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('pups', 'habits', 'Training behaviours', 1) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Listens to and follows coach instructions', 1),
    (d_id, 'Waits at the wall until told to go', 2),
    (d_id, 'Attends sessions regularly', 3);

  -- ══════════════════════════════════════════════════════
  -- DEVELOPMENT 1
  -- ══════════════════════════════════════════════════════

  -- SKILLS
  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev1', 'skills', 'Water skills', 1) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Treading water for 30 seconds', 1),
    (d_id, 'Underwater streamline glide for 5m off the wall', 2),
    (d_id, 'Confident diving entry from sitting on the side', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev1', 'skills', 'Freestyle', 2) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '25m continuous with side breathing', 1),
    (d_id, 'Flutter kick with pointed toes and straight legs', 2),
    (d_id, 'Catch with fingers angled down', 3),
    (d_id, 'Breathing every 3 strokes attempted', 4);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev1', 'skills', 'Backstroke', 3) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '25m continuous staying on back', 1),
    (d_id, 'Flutter kick with pointed toes', 2),
    (d_id, 'Arms pass close to the ears on recovery', 3),
    (d_id, 'Eyes to the ceiling', 4);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev1', 'skills', 'Breaststroke (introduction)', 4) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Whip kick with board over 25m (heels to seat, feet turn out)', 1),
    (d_id, 'Timing concept: pull – breathe – kick – glide', 2);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev1', 'skills', 'Butterfly (kick only)', 5) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Dolphin kick on front for 10m', 1),
    (d_id, 'Dolphin kick on back for 10m', 2);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev1', 'skills', 'Starts & turns (introduction)', 6) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Push off in streamline on front', 1),
    (d_id, 'Push off in streamline on back', 2),
    (d_id, 'Touch turn awareness (two-hand touch concept)', 3);

  -- HABITS
  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev1', 'habits', 'Training behaviours', 1) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '75% or higher attendance', 1),
    (d_id, 'Follows set instructions without repetition', 2),
    (d_id, 'Lane etiquette: single file, touching feet', 3);

  -- ══════════════════════════════════════════════════════
  -- DEVELOPMENT 2
  -- ══════════════════════════════════════════════════════

  -- SKILLS
  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev2', 'skills', 'Freestyle', 1) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '50m continuous', 1),
    (d_id, 'Bilateral breathing attempted (every 3 strokes)', 2),
    (d_id, 'S-shaped pull pattern', 3),
    (d_id, 'High elbow recovery', 4);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev2', 'skills', 'Backstroke', 2) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '50m continuous', 1),
    (d_id, 'Fast, straight legs (six-beat kick)', 2),
    (d_id, 'Hip rotation beginning', 3),
    (d_id, 'Steady arm tempo', 4);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev2', 'skills', 'Breaststroke', 3) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '50m continuous', 1),
    (d_id, 'Legal whip kick', 2),
    (d_id, 'Pull only to under the chin (not past shoulders)', 3),
    (d_id, 'Timing consistent over full 50m', 4);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev2', 'skills', 'Butterfly', 4) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '25m fly with two breaths', 1),
    (d_id, 'Arms recover over the water', 2),
    (d_id, 'Two dolphin kicks per arm cycle', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev2', 'skills', 'Starts, turns & finishes', 5) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Grab start from the block (introduction)', 1),
    (d_id, 'Open turn with two-hand touch (breaststroke and fly)', 2),
    (d_id, 'Streamline off every wall', 3),
    (d_id, 'Finish on a full stroke, not a glide', 4);

  -- HABITS
  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev2', 'habits', 'Training behaviours', 1) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Can read a 60-second pace clock', 1),
    (d_id, 'Follows short interval sets (e.g. 3 x 50 on 1:30)', 2),
    (d_id, '85% or higher attendance', 3);

  -- ══════════════════════════════════════════════════════
  -- DEVELOPMENT 3
  -- ══════════════════════════════════════════════════════

  -- SKILLS
  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev3', 'skills', 'Freestyle', 1) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '100m at training pace', 1),
    (d_id, 'Flip turn with streamline push-off', 2),
    (d_id, 'Bilateral breathing consistent', 3),
    (d_id, 'Strong kick across the full 100m', 4);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev3', 'skills', 'Backstroke', 2) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '100m continuous at training pace', 1),
    (d_id, 'Backstroke flip turn', 2),
    (d_id, 'Uses backstroke flags to judge wall approach', 3),
    (d_id, 'Legal finish on the back', 4);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev3', 'skills', 'Breaststroke', 3) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '100m at training pace', 1),
    (d_id, 'Legal two-hand simultaneous touch', 2),
    (d_id, 'One full pullout off the wall (one pull + one kick, surface)', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev3', 'skills', 'Butterfly', 4) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '25m fly continuous', 1),
    (d_id, 'Legal two-hand touch finish', 2);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev3', 'skills', 'Starts, turns & finishes', 5) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Legal grab or track start from the block', 1),
    (d_id, 'Flip turn in freestyle', 2),
    (d_id, 'Backstroke flip turn', 3),
    (d_id, 'Breaststroke and butterfly touch turn', 4);

  -- HABITS
  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev3', 'habits', 'Race skills', 1) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Understands the false-start rule', 1),
    (d_id, 'Race routine: warm-up, marshalling, behind the blocks', 2),
    (d_id, 'Understands race-pace vs training-pace', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('dev3', 'habits', 'Training behaviours', 2) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Uses pace clock independently', 1),
    (d_id, 'Logs own training times when asked', 2),
    (d_id, '85% or higher attendance', 3);

  -- ══════════════════════════════════════════════════════
  -- BRONZE
  -- ══════════════════════════════════════════════════════

  -- SKILLS
  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('bronze', 'skills', 'Freestyle', 1) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '200m at steady training pace with even tempo', 1),
    (d_id, 'Distance-per-stroke awareness', 2),
    (d_id, 'Strong consistent kick across the set', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('bronze', 'skills', 'Backstroke', 2) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '100m at race pace', 1),
    (d_id, 'Consistent stroke count per 25m', 2),
    (d_id, 'Three or more underwater dolphins off each wall', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('bronze', 'skills', 'Breaststroke', 3) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '100m at race pace', 1),
    (d_id, 'Clean pullout connecting to first stroke', 2),
    (d_id, 'Uses the two kicks per pull permitted for breakouts', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('bronze', 'skills', 'Butterfly', 4) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '50m at race pace', 1),
    (d_id, 'Two breaths per 25m', 2),
    (d_id, 'Rhythm between arms and kick maintained', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('bronze', 'skills', 'Individual medley', 5) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '100m IM with legal transitions between all four strokes', 1);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('bronze', 'skills', 'Starts, turns & finishes', 6) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Race dive with streamline and clean break-out', 1),
    (d_id, 'Quick reaction to the starter', 2),
    (d_id, 'Wall contact on turns under 1.5 seconds', 3);

  -- HABITS
  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('bronze', 'habits', 'Race skills', 1) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Consistent race routine', 1),
    (d_id, 'Understands heats and finals format', 2),
    (d_id, 'Reads split times', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('bronze', 'habits', 'Training', 2) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Pace clock fluency: leaving and returning on interval', 1),
    (d_id, 'Punctual and arrives prepared', 2),
    (d_id, '90% or higher attendance', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('bronze', 'habits', 'Recovery & wellbeing', 3) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Hydration habits established', 1),
    (d_id, 'Reports soreness or injury to coach early', 2),
    (d_id, 'Understands importance of sleep', 3);

  -- ══════════════════════════════════════════════════════
  -- SILVER
  -- ══════════════════════════════════════════════════════

  -- SKILLS
  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('silver', 'skills', 'Freestyle', 1) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '400m test set to a target time', 1),
    (d_id, 'Descending sets: each repeat faster than the last', 2),
    (d_id, 'Sprint mechanics for 50m and 100m events', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('silver', 'skills', 'Backstroke', 2) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '200m at race pace', 1),
    (d_id, 'Uses the 15m underwater rule off starts and turns', 2),
    (d_id, 'Tight, consistent stroke count', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('silver', 'skills', 'Breaststroke', 3) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '200m at race pace', 1),
    (d_id, 'Efficient pullout timing on every wall', 2),
    (d_id, 'Holds rhythm under fatigue', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('silver', 'skills', 'Butterfly', 4) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '100m at race pace', 1),
    (d_id, 'Consistent two-kicks-per-pull throughout', 2),
    (d_id, 'Strong finish into the wall', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('silver', 'skills', 'Individual medley', 5) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, '200m IM with legal, well-executed transitions', 1),
    (d_id, 'Event-specific transition skills (e.g. back-to-breast rollover)', 2);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('silver', 'skills', 'Starts, turns & finishes', 6) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Wall contact under 1 second on turns', 1),
    (d_id, '5m or more of underwater streamline off each wall', 2);

  -- HABITS
  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('silver', 'habits', 'Race skills', 1) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Heat management: warm-up, nutrition, between swims', 1),
    (d_id, 'Recovering mentally from a bad swim', 2),
    (d_id, 'Visualisation basics', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('silver', 'habits', 'Training', 2) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Holds target pace on long aerobic sets', 1),
    (d_id, 'Engages with dry-land sessions', 2);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('silver', 'habits', 'Recovery & wellbeing', 3) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Tracks hydration and sleep', 1),
    (d_id, 'Completes injury-prevention routines', 2);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('silver', 'habits', 'Event specialisation', 4) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Identified top two events', 1),
    (d_id, 'Sets and reviews season goals with coach', 2);

  -- ══════════════════════════════════════════════════════
  -- GOLD
  -- ══════════════════════════════════════════════════════

  -- SKILLS
  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('gold', 'skills', 'Four strokes at senior race standard', 1) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Race times meeting or approaching national age-group standards', 1),
    (d_id, 'Technical benchmarks per stroke in individual development plan', 2);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('gold', 'skills', 'Individual medley', 2) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'IM as a core event, not a secondary one', 1),
    (d_id, '200m and 400m IM race standards per swimmer''s plan', 2);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('gold', 'skills', 'Starts, turns & finishes', 3) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Measured on split times, not visual assessment', 1),
    (d_id, 'Elite-level break-out speeds', 2);

  -- HABITS
  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('gold', 'habits', 'Race skills', 1) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Pacing plans held under race pressure', 1),
    (d_id, 'Competition strategy for heats, semis, finals where applicable', 2);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('gold', 'habits', 'Training', 2) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Holds targeted paces over periodised blocks', 1),
    (d_id, 'High-intensity training capacity', 2);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('gold', 'habits', 'Recovery & wellbeing', 3) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Self-manages training load with coach guidance', 1),
    (d_id, 'Pre-habilitation routines completed independently', 2),
    (d_id, 'Nutrition practice aligned with training demands', 3);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('gold', 'habits', 'Strength & conditioning', 4) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Integrated dry-land programme executed fully', 1),
    (d_id, 'Injury resilience: few or no training interruptions', 2);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('gold', 'habits', 'Event specialisation', 5) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Two to three main events with individualised training plans', 1),
    (d_id, 'Secondary events maintained to relay standard', 2);

  INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order)
    VALUES ('gold', 'habits', 'Mental performance', 6) RETURNING id INTO d_id;
  INSERT INTO public.rubric_milestones (domain_id, text, sort_order) VALUES
    (d_id, 'Visualisation as a routine practice', 1),
    (d_id, 'Race-day routines established', 2),
    (d_id, 'Composure under pressure', 3);

END $$;
