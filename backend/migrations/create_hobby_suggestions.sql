-- Create hobby_suggestions table
CREATE TABLE IF NOT EXISTS hobby_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hobby VARCHAR(255) NOT NULL,
  suggestion TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster hobby lookups
CREATE INDEX idx_hobby_suggestions_hobby ON hobby_suggestions(hobby);

-- Add unique constraint to prevent duplicate suggestions for same hobby
CREATE UNIQUE INDEX idx_hobby_suggestions_unique ON hobby_suggestions(hobby, suggestion);

COMMENT ON TABLE hobby_suggestions IS 'Stores 200 detailed subtopic suggestions for each hobby';
COMMENT ON COLUMN hobby_suggestions.hobby IS 'The hobby name (e.g., Girişimcilik, Yoga, Fotoğrafçılık)';
COMMENT ON COLUMN hobby_suggestions.suggestion IS 'A detailed subtopic suggestion for the hobby';
