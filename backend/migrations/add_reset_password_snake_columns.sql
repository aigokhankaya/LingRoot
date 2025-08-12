-- Ensure snake_case reset password columns exist (Supabase defaults)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(12),
ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP;

-- Backfill from camelCase columns if present
DO $$
BEGIN
  -- If camelCase columns exist, copy values into snake_case when snake_case is NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='resetPasswordToken'
  ) THEN
    EXECUTE 'UPDATE users SET reset_password_token = resetPasswordToken 
             WHERE reset_password_token IS NULL AND resetPasswordToken IS NOT NULL';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='resetPasswordExpires'
  ) THEN
    EXECUTE 'UPDATE users SET reset_password_expires = resetPasswordExpires 
             WHERE reset_password_expires IS NULL AND resetPasswordExpires IS NOT NULL';
  END IF;
END $$;


