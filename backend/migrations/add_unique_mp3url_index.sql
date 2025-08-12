-- Prevent duplicates: ensure a user has at most one contenthistory per mp3_url

-- 1) Clean up existing duplicates: keep the most recent (by created_at, then id)
WITH ranked AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, mp3_url 
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM contenthistory
  WHERE mp3_url IS NOT NULL
)
DELETE FROM contenthistory ch
USING ranked r
WHERE ch.id = r.id AND r.rn > 1;

-- 2) Create unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS ux_contenthistory_user_mp3
ON contenthistory(user_id, mp3_url)
WHERE mp3_url IS NOT NULL;


