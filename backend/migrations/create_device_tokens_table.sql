-- Create device_tokens table for storing FCM/APNs device tokens per user
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'android' or 'ios'
  token TEXT NOT NULL,
  device_id TEXT,
  app_version TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure fast lookups by user and token
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_user_platform_token
  ON device_tokens(user_id, platform, token);

-- Enable Row Level Security so that users can only manage their own tokens when accessed via Supabase
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own device tokens" ON device_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own device tokens" ON device_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own device tokens" ON device_tokens
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE device_tokens IS 'Registered FCM/APNs device tokens per user.';
COMMENT ON COLUMN device_tokens.platform IS 'Device platform: android or ios.';
COMMENT ON COLUMN device_tokens.token IS 'FCM/APNs registration token for this device.';
