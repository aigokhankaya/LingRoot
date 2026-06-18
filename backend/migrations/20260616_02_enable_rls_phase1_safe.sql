-- Migration: 20260616_02_enable_rls_phase1_safe.sql
-- Purpose: Apply the safe, low-risk subset of RLS policies for public schema tables.
-- Notes:
-- 1. This file intentionally covers only tables with a clear policy model.
-- 2. Ambiguous tables are left to 20260616_03_enable_rls_phase2_manual_review.sql.
-- 3. Backend calls using service_role continue to work because service_role bypasses RLS.

-- --------------------------------------------------
-- Helper: enable RLS on a table if it exists
-- --------------------------------------------------
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    -- Public read-only catalog / lookup tables
    'public.books',
    'public.book_chapters',
    'public.chapter_audio',
    'public.leagues',
    'public.weekly_challenges',
    'public.hobby_suggestions',
    'public.vocabulary',
    'public.pattern_library',
    'public.achievements',
    'public.subscription_plans',
    'public.xp_reward_config',
    'public.sector_quest_templates',
    'public.vocabulary_topics',
    'public.topic_vocabulary',
    'public.quest_nodes',

    -- User-owned tables
    'public.user_interests',
    'public.user_settings',
    'public.user_favorites',
    'public.content_ratings',
    'public.content_feedback',
    'public.documents',
    'public.listening_sessions',
    'public.user_goals',
    'public.daily_quests',
    'public.weekly_scores',
    'public.user_challenge_progress',
    'public.user_learning_sessions',
    'public.user_daily_goals',
    'public.user_learning_streaks',
    'public.user_course_progress',
    'public.user_book_progress',
    'public.daily_usage_patterns',
    'public.user_daily_suggestions_shown',
    'public.user_daily_suggestion_logs',
    'public.user_asset_usage',
    'public.user_content_progress',
    'public.word_mastery',
    'public.quiz_attempts',
    'public.user_vocabulary',
    'public.user_gamification',
    'public.user_achievements',
    'public.user_quest_progress',
    'public.user_listening_stats',
    'public.vocabulary_mastery_extended',
    'public.xp_transactions',
    'public.user_roles',
    'public.vocabulary_generation_jobs',

    -- Parent/child messaging and documents
    'public.document_sections',
    'public.conversations',
    'public.messages',
    'public.message_attachments',
    'public.support_conversations',
    'public.support_messages',
    'public.support_message_attachments',

    -- Internal / service-managed tables
    'public.counters',
    'public.api_costs',
    'public.settings',
    'public.roles',
    'public.permissions',
    'public.role_permissions'
  ]
  LOOP
    IF to_regclass(table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
      RAISE NOTICE 'Enabled RLS on %', table_name;
    END IF;
  END LOOP;
END $$;

-- --------------------------------------------------
-- Public read-only tables
-- --------------------------------------------------
DO $$
DECLARE
  table_name text;
  short_name text;
  policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'public.books',
    'public.book_chapters',
    'public.chapter_audio',
    'public.leagues',
    'public.weekly_challenges',
    'public.hobby_suggestions',
    'public.vocabulary',
    'public.pattern_library',
    'public.achievements',
    'public.subscription_plans',
    'public.xp_reward_config',
    'public.sector_quest_templates',
    'public.vocabulary_topics',
    'public.topic_vocabulary',
    'public.quest_nodes'
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
-- Internal / service-only tables
-- --------------------------------------------------
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'public.counters',
    'public.api_costs',
    'public.settings',
    'public.roles',
    'public.permissions',
    'public.role_permissions'
  ]
  LOOP
    IF to_regclass(table_name) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON %s FROM anon, authenticated', table_name);
      RAISE NOTICE 'Revoked anon/authenticated grants on %', table_name;
    END IF;
  END LOOP;
END $$;

-- --------------------------------------------------
-- User-owned tables: full self-management
-- --------------------------------------------------
DO $$
DECLARE
  table_name text;
  short_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'public.user_interests',
    'public.user_settings',
    'public.user_favorites',
    'public.content_ratings',
    'public.content_feedback',
    'public.documents',
    'public.listening_sessions',
    'public.user_goals'
  ]
  LOOP
    IF to_regclass(table_name) IS NOT NULL THEN
      short_name := split_part(table_name, '.', 2);

      EXECUTE format('DROP POLICY IF EXISTS %I ON %s', short_name || '_select_own', table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %s', short_name || '_insert_own', table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %s', short_name || '_update_own', table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %s', short_name || '_delete_own', table_name);

      EXECUTE format(
        'CREATE POLICY %I ON %s FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)',
        short_name || '_select_own',
        table_name
      );
      EXECUTE format(
        'CREATE POLICY %I ON %s FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id)',
        short_name || '_insert_own',
        table_name
      );
      EXECUTE format(
        'CREATE POLICY %I ON %s FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL AND auth.uid() = user_id) WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id)',
        short_name || '_update_own',
        table_name
      );
      EXECUTE format(
        'CREATE POLICY %I ON %s FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)',
        short_name || '_delete_own',
        table_name
      );
    END IF;
  END LOOP;
END $$;

-- --------------------------------------------------
-- User-owned tables: read-only for the owner
-- Backend/service updates these tables.
-- --------------------------------------------------
DO $$
DECLARE
  table_name text;
  short_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'public.daily_quests',
    'public.weekly_scores',
    'public.user_challenge_progress',
    'public.user_learning_sessions',
    'public.user_daily_goals',
    'public.user_learning_streaks',
    'public.user_course_progress',
    'public.user_book_progress',
    'public.daily_usage_patterns',
    'public.user_daily_suggestions_shown',
    'public.user_daily_suggestion_logs',
    'public.user_asset_usage',
    'public.user_content_progress',
    'public.word_mastery',
    'public.quiz_attempts',
    'public.user_vocabulary',
    'public.user_gamification',
    'public.user_achievements',
    'public.user_quest_progress',
    'public.user_listening_stats',
    'public.vocabulary_mastery_extended',
    'public.xp_transactions'
  ]
  LOOP
    IF to_regclass(table_name) IS NOT NULL THEN
      short_name := split_part(table_name, '.', 2);

      EXECUTE format('DROP POLICY IF EXISTS %I ON %s', short_name || '_select_own', table_name);
      EXECUTE format(
        'CREATE POLICY %I ON %s FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)',
        short_name || '_select_own',
        table_name
      );
    END IF;
  END LOOP;
END $$;

-- --------------------------------------------------
-- user_roles: users can see their own role assignments, but not manage them.
-- --------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
    CREATE POLICY user_roles_select_own
      ON public.user_roles
      FOR SELECT
      TO authenticated
      USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
  END IF;
END $$;

-- --------------------------------------------------
-- vocabulary_generation_jobs: creator can see own jobs; creator can insert own jobs.
-- --------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.vocabulary_generation_jobs') IS NOT NULL THEN
    DROP POLICY IF EXISTS vocabulary_generation_jobs_select_own ON public.vocabulary_generation_jobs;
    DROP POLICY IF EXISTS vocabulary_generation_jobs_insert_own ON public.vocabulary_generation_jobs;

    CREATE POLICY vocabulary_generation_jobs_select_own
      ON public.vocabulary_generation_jobs
      FOR SELECT
      TO authenticated
      USING (auth.uid() IS NOT NULL AND auth.uid() = created_by);

    CREATE POLICY vocabulary_generation_jobs_insert_own
      ON public.vocabulary_generation_jobs
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);
  END IF;
END $$;

-- --------------------------------------------------
-- document_sections: only owner of parent document can read.
-- --------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.document_sections') IS NOT NULL AND to_regclass('public.documents') IS NOT NULL THEN
    DROP POLICY IF EXISTS document_sections_select_via_document_owner ON public.document_sections;

    CREATE POLICY document_sections_select_via_document_owner
      ON public.document_sections
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.documents d
          WHERE d.id = document_sections.document_id
            AND d.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- --------------------------------------------------
-- conversations / messages / attachments
-- --------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.conversations') IS NOT NULL THEN
    DROP POLICY IF EXISTS conversations_select_own ON public.conversations;
    DROP POLICY IF EXISTS conversations_insert_own ON public.conversations;
    DROP POLICY IF EXISTS conversations_update_own ON public.conversations;

    CREATE POLICY conversations_select_own
      ON public.conversations
      FOR SELECT
      TO authenticated
      USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

    CREATE POLICY conversations_insert_own
      ON public.conversations
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

    CREATE POLICY conversations_update_own
      ON public.conversations
      FOR UPDATE
      TO authenticated
      USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
      WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
  END IF;

  IF to_regclass('public.messages') IS NOT NULL AND to_regclass('public.conversations') IS NOT NULL THEN
    DROP POLICY IF EXISTS messages_select_via_conversation_owner ON public.messages;
    DROP POLICY IF EXISTS messages_insert_via_conversation_owner ON public.messages;

    CREATE POLICY messages_select_via_conversation_owner
      ON public.messages
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.conversations c
          WHERE c.id = messages.conversation_id
            AND c.user_id = auth.uid()
        )
      );

    CREATE POLICY messages_insert_via_conversation_owner
      ON public.messages
      FOR INSERT
      TO authenticated
      WITH CHECK (
        sender_id = auth.uid()
        AND sender_type = 'user'
        AND EXISTS (
          SELECT 1
          FROM public.conversations c
          WHERE c.id = messages.conversation_id
            AND c.user_id = auth.uid()
        )
      );
  END IF;

  IF to_regclass('public.message_attachments') IS NOT NULL
     AND to_regclass('public.messages') IS NOT NULL
     AND to_regclass('public.conversations') IS NOT NULL THEN
    DROP POLICY IF EXISTS message_attachments_select_via_conversation_owner ON public.message_attachments;
    DROP POLICY IF EXISTS message_attachments_insert_via_conversation_owner ON public.message_attachments;

    CREATE POLICY message_attachments_select_via_conversation_owner
      ON public.message_attachments
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.messages m
          JOIN public.conversations c ON c.id = m.conversation_id
          WHERE m.id = message_attachments.message_id
            AND c.user_id = auth.uid()
        )
      );

    CREATE POLICY message_attachments_insert_via_conversation_owner
      ON public.message_attachments
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.messages m
          JOIN public.conversations c ON c.id = m.conversation_id
          WHERE m.id = message_attachments.message_id
            AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- --------------------------------------------------
-- support conversations / messages / attachments
-- --------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.support_conversations') IS NOT NULL THEN
    DROP POLICY IF EXISTS support_conversations_select_own ON public.support_conversations;
    DROP POLICY IF EXISTS support_conversations_insert_own ON public.support_conversations;
    DROP POLICY IF EXISTS support_conversations_update_own ON public.support_conversations;

    CREATE POLICY support_conversations_select_own
      ON public.support_conversations
      FOR SELECT
      TO authenticated
      USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

    CREATE POLICY support_conversations_insert_own
      ON public.support_conversations
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

    CREATE POLICY support_conversations_update_own
      ON public.support_conversations
      FOR UPDATE
      TO authenticated
      USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
      WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
  END IF;

  IF to_regclass('public.support_messages') IS NOT NULL AND to_regclass('public.support_conversations') IS NOT NULL THEN
    DROP POLICY IF EXISTS support_messages_select_via_conversation_owner ON public.support_messages;
    DROP POLICY IF EXISTS support_messages_insert_via_conversation_owner ON public.support_messages;

    CREATE POLICY support_messages_select_via_conversation_owner
      ON public.support_messages
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.support_conversations c
          WHERE c.id = support_messages.conversation_id
            AND c.user_id = auth.uid()
        )
      );

    CREATE POLICY support_messages_insert_via_conversation_owner
      ON public.support_messages
      FOR INSERT
      TO authenticated
      WITH CHECK (
        sender_id = auth.uid()
        AND sender_type = 'user'
        AND EXISTS (
          SELECT 1
          FROM public.support_conversations c
          WHERE c.id = support_messages.conversation_id
            AND c.user_id = auth.uid()
        )
      );
  END IF;

  IF to_regclass('public.support_message_attachments') IS NOT NULL
     AND to_regclass('public.support_messages') IS NOT NULL
     AND to_regclass('public.support_conversations') IS NOT NULL THEN
    DROP POLICY IF EXISTS support_message_attachments_select_via_conversation_owner ON public.support_message_attachments;
    DROP POLICY IF EXISTS support_message_attachments_insert_via_conversation_owner ON public.support_message_attachments;

    CREATE POLICY support_message_attachments_select_via_conversation_owner
      ON public.support_message_attachments
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.support_messages m
          JOIN public.support_conversations c ON c.id = m.conversation_id
          WHERE m.id = support_message_attachments.message_id
            AND c.user_id = auth.uid()
        )
      );

    CREATE POLICY support_message_attachments_insert_via_conversation_owner
      ON public.support_message_attachments
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.support_messages m
          JOIN public.support_conversations c ON c.id = m.conversation_id
          WHERE m.id = support_message_attachments.message_id
            AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;
