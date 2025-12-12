# Multi-Factor Authentication (MFA) Integration

**Last Updated:** December 2025  
**Type:** TOTP (Time-based One-Time Password)  
**Files:** `backend/routes/mfaRoutes.js`, `backend/utils/mfaAligner.js`

## Overview

LingRoot implements TOTP-based two-factor authentication, compatible with Google Authenticator, Authy, and other TOTP apps.

## Configuration

### Environment Variables

```env
MFA_ISSUER=LingRoot
MFA_SECRET_LENGTH=20
MFA_WINDOW=1  # Allow 1 step tolerance
```

## Implementation

### Enable MFA

```javascript
// routes/mfaRoutes.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

router.post('/enable', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `LingRoot:${req.user.email}`,
    issuer: 'LingRoot',
    length: 20
  });
  
  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
  
  // Store secret temporarily (not enabled yet)
  await db('users')
    .update({ mfa_secret: secret.base32, mfa_enabled: false })
    .where('id', userId);
  
  res.json({
    secret: secret.base32,
    qrCode: qrCodeUrl
  });
});
```

### Verify & Confirm MFA Setup

```javascript
router.post('/verify-setup', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { code } = req.body;
  
  const user = await db('users').where('id', userId).first();
  
  const verified = speakeasy.totp.verify({
    secret: user.mfa_secret,
    encoding: 'base32',
    token: code,
    window: 1
  });
  
  if (!verified) {
    return res.status(400).json({ error: 'Invalid code' });
  }
  
  // Enable MFA
  await db('users')
    .update({ mfa_enabled: true })
    .where('id', userId);
  
  // Generate backup codes
  const backupCodes = generateBackupCodes();
  await storeBackupCodes(userId, backupCodes);
  
  res.json({ 
    success: true, 
    backupCodes 
  });
});
```

### Login with MFA

```javascript
// controllers/authController.js
async function login(req, res) {
  const { email, password, mfaCode } = req.body;
  
  const user = await authenticateUser(email, password);
  
  if (user.mfa_enabled) {
    if (!mfaCode) {
      // Return temporary token for MFA step
      const tempToken = jwt.sign(
        { userId: user.id, mfaPending: true },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      
      return res.json({
        requiresMFA: true,
        tempToken
      });
    }
    
    // Verify MFA code
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: mfaCode,
      window: 1
    });
    
    if (!verified) {
      // Check backup codes
      const backupValid = await verifyBackupCode(user.id, mfaCode);
      if (!backupValid) {
        return res.status(401).json({ error: 'Invalid MFA code' });
      }
    }
  }
  
  // Generate full access token
  const token = generateAccessToken(user);
  res.json({ user, token });
}
```

### MFA Verification Endpoint

```javascript
router.post('/verify', async (req, res) => {
  const { tempToken, code } = req.body;
  
  try {
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    
    if (!decoded.mfaPending) {
      return res.status(400).json({ error: 'Invalid token' });
    }
    
    const user = await db('users').where('id', decoded.userId).first();
    
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: code,
      window: 1
    });
    
    if (!verified) {
      return res.status(401).json({ error: 'Invalid code' });
    }
    
    const accessToken = generateAccessToken(user);
    res.json({ token: accessToken, user });
    
  } catch (error) {
    res.status(401).json({ error: 'Token expired' });
  }
});
```

### Disable MFA

```javascript
router.post('/disable', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { password, code } = req.body;
  
  const user = await db('users').where('id', userId).first();
  
  // Verify password
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  
  // Verify MFA code
  const verified = speakeasy.totp.verify({
    secret: user.mfa_secret,
    encoding: 'base32',
    token: code,
    window: 1
  });
  
  if (!verified) {
    return res.status(401).json({ error: 'Invalid code' });
  }
  
  // Disable MFA
  await db('users')
    .update({ 
      mfa_enabled: false, 
      mfa_secret: null 
    })
    .where('id', userId);
  
  // Invalidate backup codes
  await db('backup_codes').where('user_id', userId).delete();
  
  res.json({ success: true });
});
```

## Backup Codes

### Generation

```javascript
function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}
```

### Storage

```javascript
async function storeBackupCodes(userId, codes) {
  const hashedCodes = await Promise.all(
    codes.map(code => bcrypt.hash(code, 10))
  );
  
  await db('backup_codes').where('user_id', userId).delete();
  
  await db('backup_codes').insert(
    hashedCodes.map(hash => ({
      user_id: userId,
      code_hash: hash,
      used: false
    }))
  );
}
```

### Verification

```javascript
async function verifyBackupCode(userId, code) {
  const backupCodes = await db('backup_codes')
    .where({ user_id: userId, used: false });
  
  for (const bc of backupCodes) {
    if (await bcrypt.compare(code, bc.code_hash)) {
      // Mark as used
      await db('backup_codes')
        .update({ used: true })
        .where('id', bc.id);
      return true;
    }
  }
  
  return false;
}
```

## Database Schema

```sql
-- MFA columns in users table
ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN mfa_secret TEXT;

-- Backup codes table
CREATE TABLE backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Frontend Integration

```typescript
// Login flow with MFA
async function login(email: string, password: string, mfaCode?: string) {
  const response = await api.post('/auth/login', { email, password, mfaCode });
  
  if (response.data.requiresMFA) {
    // Show MFA input
    setShowMFAInput(true);
    setTempToken(response.data.tempToken);
    return;
  }
  
  // Login successful
  setUser(response.data.user);
  setToken(response.data.token);
}

async function verifyMFA(code: string) {
  const response = await api.post('/auth/mfa/verify', {
    tempToken,
    code
  });
  
  setUser(response.data.user);
  setToken(response.data.token);
}
```

## Security Considerations

1. **Secret Storage:** Encrypt MFA secrets at rest
2. **Rate Limiting:** Limit verification attempts
3. **Brute Force:** Lock account after failed attempts
4. **Backup Codes:** Hash before storage
5. **Session:** Short expiry for temp tokens (5 min)
6. **Recovery:** Require identity verification for reset

## Rate Limiting

```javascript
const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { error: 'Too many MFA attempts' }
});

router.post('/verify', mfaLimiter, verifyMFA);
```

## Related Documentation

- [API Architecture](../architecture/api-architecture.md)
- [Auth Endpoints](../api/endpoints.md#authentication)
- [Security](../devops/security.md)
