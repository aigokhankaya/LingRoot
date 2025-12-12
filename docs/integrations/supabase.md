# Supabase Integration

**Last Updated:** December 2025  
**Services:** Database (PostgreSQL), Storage, Auth  
**File:** `backend/utils/supabaseClient.js`

## Overview

Supabase provides the core infrastructure for LingRoot, including PostgreSQL database, file storage for audio files, and real-time capabilities.

## Configuration

### Environment Variables

```env
# Backend
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_BUCKET_NAME=audio-outputs

# Frontend
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Initialization

```javascript
// Backend: utils/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

module.exports = { supabase };
```

```typescript
// Frontend: lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

## Database Usage

### Query Patterns

```javascript
// SELECT
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

// SELECT with relations
const { data, error } = await supabase
  .from('conversations')
  .select(`
    *,
    messages (id, role, content, created_at)
  `)
  .eq('user_id', userId)
  .order('updated_at', { ascending: false });

// INSERT
const { data, error } = await supabase
  .from('content_history')
  .insert({
    user_id: userId,
    content_type: 'text',
    original_text: text,
    mp3_url: audioUrl
  })
  .select()
  .single();

// UPDATE
const { error } = await supabase
  .from('users')
  .update({ last_login: new Date() })
  .eq('id', userId);

// DELETE
const { error } = await supabase
  .from('conversations')
  .delete()
  .eq('id', conversationId)
  .eq('user_id', userId); // Security: ensure ownership

// UPSERT
const { data, error } = await supabase
  .from('user_settings')
  .upsert({
    user_id: userId,
    settings: newSettings
  })
  .select();
```

### Transactions (using RPC)

```javascript
// Define in Supabase SQL Editor
CREATE OR REPLACE FUNCTION create_subscription(
  p_user_id UUID,
  p_plan_id INT
) RETURNS void AS $$
BEGIN
  -- Cancel existing subscription
  UPDATE subscriptions SET status = 'cancelled' 
  WHERE user_id = p_user_id AND status = 'active';
  
  -- Create new subscription
  INSERT INTO subscriptions (user_id, plan_id, status)
  VALUES (p_user_id, p_plan_id, 'active');
  
  -- Update user's plan
  UPDATE users SET plan_id = p_plan_id WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

// Call from code
const { error } = await supabase.rpc('create_subscription', {
  p_user_id: userId,
  p_plan_id: planId
});
```

## Storage Usage

### File Upload

```javascript
// utils/storageUploader.js
async function uploadAudio(buffer, filename) {
  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET_NAME)
    .upload(filename, buffer, {
      contentType: 'audio/mpeg',
      cacheControl: '31536000', // 1 year
      upsert: false
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(process.env.SUPABASE_BUCKET_NAME)
    .getPublicUrl(filename);
  
  return urlData.publicUrl;
}
```

### File Deletion

```javascript
async function deleteAudio(filename) {
  const { error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET_NAME)
    .remove([filename]);
  
  if (error) throw error;
}
```

### Signed URLs (for private files)

```javascript
async function getSignedUrl(filename, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from('private-bucket')
    .createSignedUrl(filename, expiresIn);
  
  if (error) throw error;
  return data.signedUrl;
}
```

## Storage Configuration

### Bucket Setup

```sql
-- Create bucket (via Supabase Dashboard or SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-outputs', 'audio-outputs', true);

-- Set CORS policy
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'text/vtt'],
    file_size_limit = 52428800 -- 50MB
WHERE id = 'audio-outputs';
```

### Storage Policies

```sql
-- Allow public read
CREATE POLICY "Public Read" ON storage.objects
FOR SELECT USING (bucket_id = 'audio-outputs');

-- Allow authenticated upload
CREATE POLICY "Auth Upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'audio-outputs' AND
  auth.role() = 'authenticated'
);

-- Allow owner delete
CREATE POLICY "Owner Delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'audio-outputs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Row Level Security

### Users Table

```sql
-- Users can read own data
CREATE POLICY "Users read own" ON users
FOR SELECT USING (auth.uid() = id);

-- Users can update own data
CREATE POLICY "Users update own" ON users
FOR UPDATE USING (auth.uid() = id);
```

### Content History

```sql
-- Users can only access own content
CREATE POLICY "Own content only" ON content_history
FOR ALL USING (auth.uid() = user_id);
```

## Error Handling

```javascript
async function safeQuery(queryFn) {
  try {
    const { data, error } = await queryFn();
    
    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new AppError('DUPLICATE_ENTRY', 'Record already exists', 400);
      }
      if (error.code === '23503') { // Foreign key violation
        throw new AppError('INVALID_REFERENCE', 'Referenced record not found', 400);
      }
      if (error.code === 'PGRST116') { // Not found
        throw new AppError('NOT_FOUND', 'Record not found', 404);
      }
      throw new AppError('DATABASE_ERROR', error.message, 500);
    }
    
    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Supabase error:', error);
    throw new AppError('DATABASE_ERROR', 'Database operation failed', 500);
  }
}
```

## Performance Optimization

### Indexes

```sql
-- Create indexes for common queries
CREATE INDEX idx_content_history_user_created 
ON content_history(user_id, created_at DESC);

CREATE INDEX idx_conversations_user_updated 
ON conversations(user_id, updated_at DESC);

CREATE INDEX idx_messages_conversation 
ON messages(conversation_id, created_at ASC);
```

### Pagination

```javascript
async function getPaginatedContent(userId, page = 1, limit = 20) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const { data, error, count } = await supabase
    .from('content_history')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  };
}
```

## Security Considerations

1. **Service Key:** Never expose in client code
2. **RLS:** Enable Row Level Security on all tables
3. **Anon Key:** Only use for public operations
4. **Policies:** Define strict access policies
5. **Validation:** Validate data before insert/update

## Monitoring

### Query Performance

```javascript
// Log slow queries
const startTime = Date.now();
const { data, error } = await supabase.from('users').select('*');
const duration = Date.now() - startTime;

if (duration > 1000) {
  logger.warn(`Slow query: ${duration}ms`);
}
```

### Connection Health

```javascript
async function checkSupabaseHealth() {
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
}
```

## Related Files

- `backend/utils/supabaseClient.js` - Client initialization
- `backend/utils/storageUploader.js` - Storage operations
- `backend/migrations/` - Database migrations

## Related Documentation

- [Database Schema](../database/schema-overview.md)
- [API Architecture](../architecture/api-architecture.md)
- [Environment Variables](../devops/environment-variables.md)
