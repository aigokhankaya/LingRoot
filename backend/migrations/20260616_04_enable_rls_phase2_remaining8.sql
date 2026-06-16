-- Migration: 20260616_04_enable_rls_phase2_remaining8.sql
-- Purpose: Resolve the final 8 RLS-disabled tables reported by Supabase Security Advisor.
--
-- Assumptions used here:
-- 1. content graph tables are global/editorial data and should be public read-only.
-- 2. generated_suggestions contains both public seed rows and potentially user-owned rows.
-- 3. suggestion_click_logs is analytics/internal unless you later decide to log directly from the client.

-- --------------------------------------------------
-- Enable RLS on all remaining tables if present
-- --------------------------------------------------
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'public.generated_suggestions',
    'public.suggestion_click_logs',
    'public.content_tags',
    'public.content_folders',
    'public.topic_nodes',
    'public.content_items',
    'public.content_relations',
    'public.content_categories'
  ]
  LOOP
    IF to_regclass(table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
      RAISE NOTICE 'Enabled RLS on %', table_name;
    END IF;
  END LOOP;
END $$;

-- --------------------------------------------------
-- Global content graph / taxonomy tables: public read-only
-- --------------------------------------------------
DO $$
DECLARE
  table_name text;
  short_name text;
  policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'public.content_tags',
    'public.content_folders',
    'public.topic_nodes',
    'public.content_items',
    'public.content_relations',
    'public.content_categories'
  ]
  LOOP
    IF to_regclass(table_name) IS NOT NULL THEN
      short_name := split_part(table_name, '.', 2);
      policy_name := short_name || '_select_public';

      EXECUTE format('DROP POLICY IF EXISTS %I ON %s', policy_name, table_name);
      EXECUTE format(
        'CREATE POLICY %I ON %s FOR SELECT TO anon, authenticated USING (true)',
        policy_name,
        table_name
      );
    END IF;
  END LOOP;
END $$;

-- --------------------------------------------------
-- generated_suggestions
-- Public seed rows stay visible.
-- User-specific rows are visible only to their owner.
-- Sentinel UUID is taken from the seed migration already in the repo.
-- --------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.generated_suggestions') IS NOT NULL THEN
    DROP POLICY IF EXISTS generated_suggestions_select_public_or_own ON public.generated_suggestions;

    CREATE POLICY generated_suggestions_select_public_or_own
      ON public.generated_suggestions
      FOR SELECT
      TO anon, authenticated
      USING (
        user_id = '00000000-0000-0000-0000-000000000000'::uuid
        OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
      );
  END IF;
END $$;

-- --------------------------------------------------
-- suggestion_click_logs
-- Current repo usage does not show direct client reads.
-- Keep this table internal/service-managed for now.
-- If later you need direct client writes, replace with an INSERT own policy.
-- --------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.suggestion_click_logs') IS NOT NULL THEN
    REVOKE ALL ON public.suggestion_click_logs FROM anon, authenticated;
  END IF;
END $$;
