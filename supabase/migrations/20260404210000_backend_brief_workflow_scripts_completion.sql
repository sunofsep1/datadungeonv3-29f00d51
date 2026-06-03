-- Backend upgrade brief: workflow branching, deal/listing stage triggers, script library seeds.

-- ---------------------------------------------------------------------------
-- 1) CRM workflow steps: if_branch + branch routing columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.crm_workflow_steps
  DROP CONSTRAINT IF EXISTS crm_workflow_steps_action_type_check;

ALTER TABLE public.crm_workflow_steps
  ADD CONSTRAINT crm_workflow_steps_action_type_check CHECK (action_type IN (
    'noop',
    'wait_delay',
    'create_task',
    'notify_user',
    'update_contact',
    'add_to_sequence',
    'send_sms',
    'send_email',
    'if_branch'
  ));

ALTER TABLE public.crm_workflow_steps
  ADD COLUMN IF NOT EXISTS branch_condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS next_step_order_if_true INTEGER,
  ADD COLUMN IF NOT EXISTS next_step_order_if_false INTEGER;

COMMENT ON COLUMN public.crm_workflow_steps.branch_condition IS
  'if_branch: JSON e.g. {"kind":"listing_field","field":"pipeline_stage","equals":"Listed"} or {"kind":"contact_field","field":"contact_category","equals":"hot_lead"} or {"kind":"score_gte","value":61} or {"kind":"always_true"}';
COMMENT ON COLUMN public.crm_workflow_steps.next_step_order_if_true IS
  'if_branch: step_order when condition is true (NULL = current_step_order + 1)';
COMMENT ON COLUMN public.crm_workflow_steps.next_step_order_if_false IS
  'if_branch: step_order when condition is false (NULL = current_step_order + 1)';

-- ---------------------------------------------------------------------------
-- 2) CRM workflows: deal_stage_change (listing pipeline; alias in brief §3)
-- ---------------------------------------------------------------------------
ALTER TABLE public.crm_workflows
  DROP CONSTRAINT IF EXISTS crm_workflows_trigger_type_check;

ALTER TABLE public.crm_workflows
  ADD CONSTRAINT crm_workflows_trigger_type_check CHECK (trigger_type IN (
    'manual',
    'contact_property_change',
    'listing_stage_change',
    'deal_stage_change',
    'form_submission',
    'date_based',
    'score_threshold'
  ));

COMMENT ON COLUMN public.crm_workflows.trigger_conditions IS
  'For listing_stage_change / deal_stage_change + trigger_object listing: {"pipeline_stage":"Listed"} or {"pipeline_stages":["Listed","Sold"]}';

-- ---------------------------------------------------------------------------
-- 3) Auto-enroll listing workflows when pipeline_stage changes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_enqueue_crm_workflows_on_listing_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;
  IF NEW.pipeline_stage IS NOT DISTINCT FROM OLD.pipeline_stage THEN
    RETURN NEW;
  END IF;
  IF NEW.pipeline_stage IS NULL OR length(trim(NEW.pipeline_stage)) = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.crm_workflow_enrollments (
    workflow_id,
    user_id,
    listing_id,
    contact_id,
    current_step_order,
    status,
    next_action_at,
    context
  )
  SELECT
    w.id,
    w.user_id,
    NEW.id,
    NULL,
    0,
    'active',
    NOW() + (
      COALESCE(
        (SELECT s.delay_minutes
         FROM public.crm_workflow_steps s
         WHERE s.workflow_id = w.id
         ORDER BY s.step_order ASC
         LIMIT 1),
        0
      ) * INTERVAL '1 minute'
    ),
    jsonb_build_object(
      'trigger', 'listing_stage_change',
      'pipeline_stage', NEW.pipeline_stage,
      'previous_pipeline_stage', OLD.pipeline_stage
    )
  FROM public.crm_workflows w
  WHERE w.user_id = NEW.user_id
    AND w.is_active = TRUE
    AND w.trigger_object = 'listing'
    AND w.trigger_type IN ('listing_stage_change', 'deal_stage_change')
    AND (
      (w.trigger_conditions ? 'pipeline_stage'
        AND trim(both FROM (w.trigger_conditions->>'pipeline_stage')) = trim(both FROM NEW.pipeline_stage))
      OR (
        w.trigger_conditions ? 'pipeline_stages'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(w.trigger_conditions->'pipeline_stages', '[]'::jsonb)) AS t(st)
          WHERE trim(both FROM t.st) = trim(both FROM NEW.pipeline_stage)
        )
      )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.crm_workflow_enrollments e
      WHERE e.workflow_id = w.id
        AND e.listing_id = NEW.id
        AND e.status = 'active'
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_crm_workflows_on_listing_stage ON public.listings;
CREATE TRIGGER trg_enqueue_crm_workflows_on_listing_stage
  AFTER UPDATE OF pipeline_stage ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enqueue_crm_workflows_on_listing_stage();

-- ---------------------------------------------------------------------------
-- 4) Script library: global templates + idempotent seed into user scripts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.script_library_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sort_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN (
      'listing_presentation',
      'objection_handling',
      'follow_up',
      'cold_call',
      'price_reduction',
      'commission_defence',
      'appraisal_booking',
      'annual_review',
      'text_template',
      'other'
    )
  ),
  situation_trigger TEXT,
  content TEXT NOT NULL,
  psychology_note TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (title)
);

ALTER TABLE public.script_library_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS script_library_templates_select ON public.script_library_templates;
CREATE POLICY script_library_templates_select ON public.script_library_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.seed_scripts_from_library()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.scripts (
    user_id,
    title,
    category,
    situation_trigger,
    content,
    psychology_note,
    tags
  )
  SELECT
    auth.uid(),
    t.title,
    t.category,
    t.situation_trigger,
    t.content,
    t.psychology_note,
    t.tags
  FROM public.script_library_templates t
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.scripts s
    WHERE s.user_id = auth.uid()
      AND s.title = t.title
  )
  ORDER BY t.sort_order ASC, t.title ASC;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_scripts_from_library() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_scripts_from_library() TO authenticated;

INSERT INTO public.script_library_templates (sort_order, title, category, situation_trigger, content, psychology_note, tags)
VALUES
  (10, 'Commission objection — reframe value', 'commission_defence',
   'Prospect asks you to cut commission or says another agent is cheaper',
   'I completely understand wanting the best fee structure — most sellers do. What I focus on is net outcome: days on market, buyer reach, and negotiation strength. My fee covers [specific deliverables: campaign, open homes, database buyers, negotiation]. If we optimise for the highest net sale price, the percentage is usually the smallest variable. Are you open to walking through what you get at each stage so you can compare apples to apples?',
   'Acknowledge the frame (money), then reframe to net result and certainty rather than arguing on percentage alone.',
   ARRAY['commission', 'objection', 'fee']),

  (20, 'Dear John — polite withdraw after overpriced instruction', 'follow_up',
   'Seller chose another agent or unrealistic price; maintain relationship',
   'Thanks again for the time you gave me on [address]. I am genuinely cheering for a great result. If anything shifts on strategy or timing, I am one message away — no pressure either way.',
   'Ends with warmth and an open door; no resentment language.',
   ARRAY['dear john', 'lost listing', 'relationship']),

  (30, 'Overpricing concern — curiosity not confrontation', 'price_reduction',
   'Seller wants a number above comparable evidence',
   'I hear you on wanting to test the market at [X]. My job is to show you what buyers are actually paying nearby so you can choose knowingly. Can we line up three recent sales and active competition, then pick a launch strategy you are comfortable defending?',
   'Join their goal, insert evidence, ask permission to compare.',
   ARRAY['price', 'seller', 'evidence']),

  (40, 'Appraisal booking — low-friction CTA', 'appraisal_booking',
   'Warm lead agrees to “think about it”',
   'Happy to leave this with you. The easiest next step is a 20-minute walkthrough — no paperwork, just numbers and a rough campaign sketch. Tuesday 10am or Thursday 4pm — which is less chaotic for you?',
   'Assume the meeting; offer two times (alternative of choice).',
   ARRAY['appraisal', 'booking', 'cta']),

  (50, 'Annual review invite — value first', 'annual_review',
   'Top 100 / past client — January review offer',
   'Quick heads-up: I am booking January equity reviews for my past clients — mortgage snapshot, insurance check-in, and a 10-minute market pulse on your area. Want me to hold a slot before they fill?',
   'Scarcity + concrete deliverables; short.',
   ARRAY['annual review', 'january', 'past client']),

  (60, 'Frame: “expensive” → “investment in outcome”', 'objection_handling',
   'Buyer or seller labels marketing or fee as expensive',
   'Totally fair word — “expensive” usually means we have not connected the spend to the outcome yet. When you see how this translates to more qualified buyers and cleaner negotiation, the question becomes whether the plan fits your goals. What outcome would make this feel worthwhile?',
   'Redefine the label; ask outcome question.',
   ARRAY['frame', 'psychology', 'objection']),

  (70, 'Price reduction conversation — data-led', 'price_reduction',
   'Listing feedback says price is the barrier',
   'Feedback is clustering around price, not the home. That is actually good news — it is one lever. Here is what I suggest: we pick a bracket boundary buyers search on, refresh the campaign headline, and give it 10–14 days with a clear KPI. If we miss it, we revisit with fresh comps. Sound reasonable?',
   'Normalize feedback; single lever; time-box.',
   ARRAY['price reduction', 'seller', 'feedback']),

  (80, 'Text — running late to appointment', 'text_template',
   'Running 5–10 minutes late',
   'Running about 8 minutes late — traffic on [road]. Still very keen to see you; will text when I am parked.',
   'Specific time + accountability.',
   ARRAY['sms', 'late', 'courtesy'])
ON CONFLICT (title) DO NOTHING;

NOTIFY pgrst, 'reload schema';
