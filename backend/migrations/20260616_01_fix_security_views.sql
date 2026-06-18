-- Migration: 20260616_01_fix_security_views.sql
-- Purpose: Remove SECURITY DEFINER behavior from public views flagged by Supabase lints.

DO $$
DECLARE
  view_name text;
BEGIN
  FOREACH view_name IN ARRAY ARRAY[
    'public.user_permissions_view',
    'public.topic_tree_view',
    'public.v_user_memory_palace',
    'public.v_daily_listening_quality'
  ]
  LOOP
    IF to_regclass(view_name) IS NOT NULL THEN
      EXECUTE format(
        'ALTER VIEW %s SET (security_invoker = true)',
        view_name
      );
      RAISE NOTICE 'Updated view % to security_invoker', view_name;
    ELSE
      RAISE NOTICE 'Skipped missing view %', view_name;
    END IF;
  END LOOP;
END $$;
