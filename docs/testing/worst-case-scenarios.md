# Worst Case Scenarios & Failure Modes

**Last Updated:** December 2025  
**Purpose:** Document potential failure scenarios and mitigation strategies

## Critical Service Failures

### 1. OpenAI API Unavailable

**Impact:** CEFR adaptation, AI Chat, and topic generation fail

**Symptoms:**
- 502/503 errors from AI endpoints
- Timeout on chat messages
- Empty adapted text responses

**Mitigation:**
```javascript
// Fallback to cached responses or simpler processing
if (openaiError) {
  logger.error('OpenAI unavailable, using fallback');
  return {
    adaptedText: originalText, // Pass through without adaptation
    warning: 'CEFR_ADAPTATION_UNAVAILABLE'
  };
}
```

**Recovery Steps:**
1. Check OpenAI status page
2. Verify API key validity
3. Check rate limits
4. Switch to backup model if available

---

### 2. TTS Service Failure

**Impact:** No audio generation for content

**Symptoms:**
- TTS endpoint returns 500
- Empty MP3 URLs
- Timeout on audio generation

**Mitigation:**
```javascript
// Try fallback TTS providers
const providers = ['google', 'azure', 'polly'];
for (const provider of providers) {
  try {
    return await synthesize(text, provider);
  } catch (e) {
    logger.warn(`TTS provider ${provider} failed, trying next`);
  }
}
throw new Error('All TTS providers failed');
```

**Recovery Steps:**
1. Check individual provider status
2. Verify credentials
3. Check quota/billing
4. Scale down speaking rate

---

### 3. Database (Supabase) Unavailable

**Impact:** Complete system failure

**Symptoms:**
- All API calls fail
- Login impossible
- Data not persisting

**Mitigation:**
- Read-only mode from cache
- Queue writes for retry
- Display maintenance message

**Recovery Steps:**
1. Check Supabase status
2. Verify connection string
3. Check project pause status
4. Contact Supabase support

---

### 4. Storage (Supabase) Unavailable

**Impact:** Audio files not accessible

**Symptoms:**
- MP3 URLs return 404
- Upload fails
- Broken audio players

**Mitigation:**
```javascript
// Retry upload with exponential backoff
async function uploadWithRetry(file, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await upload(file);
    } catch (e) {
      await delay(Math.pow(2, i) * 1000);
    }
  }
  throw new Error('Storage upload failed after retries');
}
```

---

## Application-Level Failures

### 5. Memory Exhaustion

**Cause:** Processing very large files or many concurrent requests

**Symptoms:**
- Server crashes
- OOM errors in logs
- Slow responses

**Prevention:**
```javascript
// Limit file size
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Stream large files instead of loading to memory
const stream = fs.createReadStream(filePath);
```

**Recovery:**
1. Restart server
2. Reduce concurrent processing
3. Add memory limits to containers

---

### 6. Rate Limit Exhaustion

**Cause:** Too many requests to external APIs

**Symptoms:**
- 429 responses from OpenAI/TTS
- Queued requests timing out

**Prevention:**
```javascript
// Implement rate limiting
const limiter = new RateLimiter({
  tokensPerInterval: 50,
  interval: 'minute'
});

await limiter.removeTokens(1);
await makeRequest();
```

**Recovery:**
1. Wait for rate limit reset
2. Reduce request frequency
3. Upgrade API tier

---

### 7. JWT Token Compromise

**Cause:** Token leaked or stolen

**Symptoms:**
- Unauthorized access
- Unusual user activity
- Multiple simultaneous sessions

**Response:**
```javascript
// Invalidate all user tokens
async function revokeAllTokens(userId) {
  await db.update('users')
    .set({ token_version: db.raw('token_version + 1') })
    .where('id', userId);
}
```

**Recovery:**
1. Rotate JWT secret
2. Force all users to re-login
3. Investigate breach source

---

### 8. Concurrent Subscription Purchase

**Cause:** User purchases on multiple devices simultaneously

**Symptoms:**
- Duplicate subscriptions
- Billing issues
- Plan conflicts

**Prevention:**
```javascript
// Use database transaction with lock
await db.transaction(async (trx) => {
  const existing = await trx('subscriptions')
    .where('user_id', userId)
    .where('status', 'active')
    .forUpdate()
    .first();
    
  if (existing) {
    throw new Error('Active subscription exists');
  }
  
  await trx('subscriptions').insert(newSubscription);
});
```

---

## Data Corruption Scenarios

### 9. Partial Content Save

**Cause:** Server crash during multi-step save

**Symptoms:**
- Audio exists but no database record
- VTT missing for existing audio
- Orphaned files

**Prevention:**
```javascript
// Use transactions
await db.transaction(async (trx) => {
  const contentId = await trx('content_history').insert(content);
  await uploadAudio(contentId);
  await trx('content_history').update({ mp3_url: url }).where('id', contentId);
});
```

**Cleanup:**
```javascript
// Periodic cleanup job
async function cleanupOrphanedFiles() {
  const dbUrls = await db('content_history').pluck('mp3_url');
  const storageFiles = await listStorageFiles();
  
  for (const file of storageFiles) {
    if (!dbUrls.includes(file.url)) {
      await deleteFile(file);
    }
  }
}
```

---

### 10. Invalid CEFR Adaptation

**Cause:** AI produces output outside level constraints

**Symptoms:**
- A1 content with complex sentences
- Vocabulary too advanced for level
- Grammar beyond level

**Prevention:**
```javascript
// Post-processing validation
function validateCEFROutput(text, level) {
  const maxSentenceLength = LEVEL_LIMITS[level].maxWords;
  const sentences = text.split(/[.!?]/);
  
  for (const sentence of sentences) {
    if (wordCount(sentence) > maxSentenceLength) {
      logger.warn('CEFR output exceeds level constraints');
      return simplifyFurther(text, level);
    }
  }
  return text;
}
```

---

## Infrastructure Failures

### 11. CDN/Network Issues

**Cause:** Network problems between services

**Symptoms:**
- Intermittent failures
- High latency
- Partial page loads

**Mitigation:**
- Use multiple CDN regions
- Implement retry logic
- Cache aggressively

---

### 12. SSL Certificate Expiration

**Cause:** Certificate not renewed

**Symptoms:**
- Browser security warnings
- API calls fail
- Mobile app connection errors

**Prevention:**
- Automated certificate renewal (Let's Encrypt)
- Monitoring for certificate expiry
- Calendar reminders

---

## Disaster Recovery

### Full System Recovery Procedure

1. **Database Restore**
   ```bash
   # Restore from Supabase backup
   supabase db restore --backup-id <id>
   ```

2. **Storage Restore**
   ```bash
   # Sync from backup bucket
   supabase storage sync --source backup-bucket --target audio-outputs
   ```

3. **Service Restart**
   ```bash
   # Restart all services
   pm2 restart all
   ```

4. **Verification**
   - Run smoke tests
   - Check critical endpoints
   - Monitor error rates

### Backup Strategy

| Data | Frequency | Retention |
|------|-----------|-----------|
| Database | Daily | 30 days |
| Audio files | N/A (regenerable) | - |
| Logs | Daily | 7 days |
| Config | On change | Unlimited |

## Monitoring & Alerts

### Critical Alerts

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate | >5% | Page on-call |
| Response time | >5s | Investigate |
| Database connections | >80% | Scale/investigate |
| Storage usage | >80% | Cleanup/expand |

## Related Documentation

- [QA Checklist](./qa-checklist.md)
- [Local Setup](../devops/local-setup.md)
- [System Overview](../architecture/system-overview.md)
