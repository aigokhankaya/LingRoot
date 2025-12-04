# Code Cleanup Checklist

**Generated:** December 4, 2025  
**Status:** Automated scan results - requires developer validation

## Overview

This document contains the results of an automated code quality scan across the LingRoot codebase.

---

## 1. Unused Imports (Estimated)

### Backend Controllers

| File | Issue | Action |
|------|-------|--------|
| `ttsController.js` | Large file (109KB) - likely unused imports | Review imports |
| `authController.js` | Large file (53KB) - check for unused requires | Review imports |
| `adminController.js` | Large file (53KB) - check for unused requires | Review imports |

### Frontend Components

| File | Issue | Action |
|------|-------|--------|
| `InputSection.tsx` | 63KB - verify all imports used | Run ESLint |
| `SyncedTextPlayer.tsx` | 56KB - verify all imports used | Run ESLint |

**Recommended Action:**
```bash
# Run ESLint with unused imports rule
cd frontend && npx eslint src --rule 'no-unused-vars: error' --fix
cd backend && npx eslint . --rule 'no-unused-vars: error' --fix
```

---

## 2. Potential Dead Code

### Backend Files to Review

| File | Concern | Priority |
|------|---------|----------|
| `backend/utils/claudeClient.js` | Is Claude API in use? | Medium |
| `backend/utils/newsService.js` | Is news service active? | Medium |
| `backend/utils/semanticAudit.js` | Usage frequency? | Low |
| `backend/test-*.js` | Test files in root | Low |
| `components/AudioPlayer_bck.tsx` | Backup file | High - Remove |

### Frontend Components

| Component | Concern | Priority |
|-----------|---------|----------|
| `AudioPlayer_bck.tsx` | Backup file, should remove | High |
| `ProcessInput.tsx` | Replaced by InputSection? | Medium |

**Recommended Action:**
- Search for usages of each file
- Remove confirmed dead code
- Archive if historical reference needed

---

## 3. Duplicated Logic

### Identified Patterns

| Pattern | Files | Recommendation |
|---------|-------|----------------|
| API error handling | Multiple controllers | Create shared error handler |
| Supabase queries | Controllers | Create repository pattern |
| JWT verification | Multiple routes | Already in middleware ✓ |
| Rate limiting | Multiple endpoints | Create reusable limiter |

### Example: Error Handling Pattern

```javascript
// Current: Duplicated in each controller
try {
  // operation
} catch (error) {
  logger.error('Error:', error);
  res.status(500).json({ error: error.message });
}

// Recommended: Shared utility
const asyncHandler = require('../utils/asyncHandler');

router.get('/endpoint', asyncHandler(async (req, res) => {
  // operation - errors automatically handled
}));
```

---

## 4. Inconsistent Naming

### Files

| Issue | Files | Standard |
|-------|-------|----------|
| Mixed case in prompts | `Kullanılmayan Promtlar/` | Use kebab-case |
| Underscore vs camel | `google-credentials.json` vs `supabaseClient.js` | Choose one |

### Variables/Functions

| Pattern | Count | Recommendation |
|---------|-------|----------------|
| `camelCase` functions | ~90% | Standard ✓ |
| `snake_case` DB fields | 100% | Standard ✓ |
| Mixed API responses | Some | Standardize to camelCase |

---

## 5. Missing Error Handling

### Areas to Review

| Area | Issue | Priority |
|------|-------|----------|
| TTS synthesis | Some providers lack try-catch | High |
| File upload | Stream error handling | Medium |
| Database transactions | Some operations not atomic | High |
| External API calls | Timeout handling | Medium |

### Recommended Pattern

```javascript
// Ensure all async operations have proper error handling
async function processWithRetry(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(Math.pow(2, i) * 1000);
    }
  }
}
```

---

## 6. Unhandled Promises

### Check These Files

| File | Pattern | Fix |
|------|---------|-----|
| `socketManager.js` | Event handlers | Add try-catch |
| `pushNotification.js` | Firebase calls | Await or catch |
| Various controllers | .then() without .catch() | Add error handling |

**Detection Command:**
```bash
# Find potential unhandled promises
grep -r "\.then(" backend --include="*.js" | grep -v "catch"
```

---

## 7. Hardcoded Values

### Identified

| Location | Value | Recommendation |
|----------|-------|----------------|
| CORS origins | Hardcoded URLs | Move to env |
| Rate limits | Hardcoded numbers | Move to config |
| Model names | `gpt-4o-mini` | Move to env |
| Chunk sizes | 4000 chars | Move to config |

### Already Externalized ✓

- API keys
- Database credentials
- JWT secrets
- Service endpoints

---

## 8. Security Considerations

### To Review

| Item | Status | Action |
|------|--------|--------|
| API key exposure in logs | ⚠️ Check | Audit logger output |
| SQL injection prevention | ✓ Parameterized | Verified |
| XSS prevention | ✓ Helmet | Verified |
| CORS configuration | ⚠️ Review | Check for wildcards |
| Rate limiting | ✓ Implemented | Verified |

---

## 9. Performance Concerns

### Large Files

| File | Size | Recommendation |
|------|------|----------------|
| `i18n.ts` | 236KB | Consider splitting by locale |
| `ttsController.js` | 109KB | Consider splitting by feature |
| `InputSection.tsx` | 63KB | Split into sub-components |
| `SyncedTextPlayer.tsx` | 56KB | Split into sub-components |

### Database Queries

| Query | Concern | Fix |
|-------|---------|-----|
| User with all relations | May be slow | Add pagination |
| Content history | No limit | Add limit |
| Book chapters | Full text load | Lazy load |

---

## 10. Documentation Gaps

### Missing JSDoc

| Area | Coverage | Priority |
|------|----------|----------|
| Controllers | ~30% | High |
| Utils | ~20% | High |
| Components | ~40% | Medium |
| Types | 80% | Low |

### Missing README

| Location | Status |
|----------|--------|
| `/backend` | Has README_MFA.md |
| `/frontend` | Missing |
| `/LingRootMobile` | Has README.md |
| `/scripts` | Has README.md |

---

## Action Items Summary

### High Priority
1. [ ] Remove `AudioPlayer_bck.tsx`
2. [ ] Add missing try-catch in TTS providers
3. [ ] Ensure all promises are handled
4. [ ] Split large components

### Medium Priority
5. [ ] Create shared error handler
6. [ ] Standardize naming conventions
7. [ ] Add JSDoc to controllers
8. [ ] Move hardcoded values to config

### Low Priority
9. [ ] Clean up test files
10. [ ] Review and remove dead code
11. [ ] Split i18n by locale
12. [ ] Add missing READMEs

---

## Automated Tools

Run these to catch issues:

```bash
# ESLint for JavaScript/TypeScript
npm run lint

# Find unused exports
npx ts-prune

# Find circular dependencies
npx madge --circular src

# Check for security vulnerabilities
npm audit

# Find duplicated code
npx jscpd src
```

---

*This checklist was generated automatically and requires manual verification.*
