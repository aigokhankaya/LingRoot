-- Migration: 20260616_03_enable_rls_phase2_manual_review.sql
-- Purpose: Track the remaining Supabase lint findings that need schema/business review
-- before RLS can be enabled safely.
--
-- IMPORTANT:
-- Do not apply blanket RLS to these tables until ownership and access rules are confirmed.
-- Several of them may currently serve mixed use-cases: public catalog + internal writes,
-- graph-like relations, or backend-generated records consumed by multiple flows.

-- Remaining tables from the lint report that need manual policy design:
--
-- 1. generated_suggestions
--    Question:
--    Is this user-specific output, a global recommendation catalog, or a cache table?
--    Likely options:
--    - user-scoped read/write via user_id
--    - internal cache with service_role-only access
--
-- 2. content_tags
--    Question:
--    Is this a global taxonomy table?
--    Likely policy:
--    - public/authenticated SELECT only
--
-- 3. content_folders
--    Question:
--    Are folders global editorial folders or user-owned folders?
--    Likely policy:
--    - global read-only if editorial
--    - own-only if user-owned
--
-- 4. topic_nodes
--    Question:
--    Global content graph or user-generated topic graph?
--    Likely policy:
--    - public read-only if global
--    - own-only if user-specific
--
-- 5. content_items
--    Question:
--    Does this include draft and published items in the same table?
--    Likely policy:
--    - published rows readable by users
--    - drafts service/admin only
--
-- 6. content_relations
--    Question:
--    Pure graph edge table for global content?
--    Likely policy:
--    - public/authenticated SELECT only
--
-- 7. content_categories
--    Question:
--    Global taxonomy table?
--    Likely policy:
--    - public/authenticated SELECT only

-- Suggested inspection query:
SELECT
  c.table_name,
  c.column_name,
  c.data_type
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    'generated_suggestions',
    'content_tags',
    'content_folders',
    'topic_nodes',
    'content_items',
    'content_relations',
    'content_categories'
  )
ORDER BY c.table_name, c.ordinal_position;

-- After schema review, implement each table in one of these categories:
--
-- A. Public read-only catalog
-- ALTER TABLE public.some_table ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY some_table_select_public
--   ON public.some_table
--   FOR SELECT
--   TO anon, authenticated
--   USING (true);
--
-- B. User-owned
-- ALTER TABLE public.some_table ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY some_table_select_own
--   ON public.some_table
--   FOR SELECT
--   TO authenticated
--   USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
--
-- C. Parent-owned / join-based
-- ALTER TABLE public.some_table ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY some_table_select_via_parent
--   ON public.some_table
--   FOR SELECT
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1
--       FROM public.parent_table p
--       WHERE p.id = some_table.parent_id
--         AND p.user_id = auth.uid()
--     )
--   );
--
-- D. Internal only
-- ALTER TABLE public.some_table ENABLE ROW LEVEL SECURITY;
-- REVOKE ALL ON public.some_table FROM anon, authenticated;
