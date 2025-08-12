-- Add reset password fields to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS resetPasswordToken VARCHAR(12),
ADD COLUMN IF NOT EXISTS resetPasswordExpires TIMESTAMP;


