/*
# Create StudyFlow persistent state

1. New Tables
- `studyflow_state` stores the single StudyFlow workspace for this no-sign-in personal app.
- `id` is the singleton primary key.
- `data` stores tasks, study sessions, sleep entries, habits, habit logs, goals, and settings as structured JSON.
- `updated_at` records the last saved change.
2. Security
- Row level security is enabled.
- Anonymous and authenticated clients may read and update the intentionally single-tenant workspace through separate CRUD policies.
3. Important Notes
- This app does not include accounts, so the workspace is intentionally shared by the app instance.
- The singleton key prevents accidental creation of multiple workspaces.
*/

CREATE TABLE IF NOT EXISTS public.studyflow_state (
  id text PRIMARY KEY DEFAULT 'default',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.studyflow_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studyflow_state_select" ON public.studyflow_state;
CREATE POLICY "studyflow_state_select" ON public.studyflow_state FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "studyflow_state_insert" ON public.studyflow_state;
CREATE POLICY "studyflow_state_insert" ON public.studyflow_state FOR INSERT TO anon, authenticated WITH CHECK (id = 'default');

DROP POLICY IF EXISTS "studyflow_state_update" ON public.studyflow_state;
CREATE POLICY "studyflow_state_update" ON public.studyflow_state FOR UPDATE TO anon, authenticated USING (id = 'default') WITH CHECK (id = 'default');

DROP POLICY IF EXISTS "studyflow_state_delete" ON public.studyflow_state;
CREATE POLICY "studyflow_state_delete" ON public.studyflow_state FOR DELETE TO anon, authenticated USING (id = 'default');
