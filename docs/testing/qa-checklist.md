# QA Checklist

**Last Updated:** December 2025  
**Target:** Production Release

## Pre-Release Checklist

### Authentication & Authorization

| Test Case | Status | Priority |
|-----------|--------|----------|
| [ ] Email registration with valid data | | P0 |
| [ ] Email registration with duplicate email (should fail) | | P0 |
| [ ] Email login with correct credentials | | P0 |
| [ ] Email login with wrong password | | P0 |
| [ ] Google Sign-In | | P0 |
| [ ] Apple Sign-In | | P0 |
| [ ] Facebook Sign-In | | P1 |
| [ ] MFA enable/disable | | P1 |
| [ ] MFA verification | | P1 |
| [ ] Password reset flow | | P0 |
| [ ] Token refresh | | P0 |
| [ ] Session timeout | | P1 |
| [ ] Admin login | | P0 |
| [ ] Admin role restrictions | | P0 |

### TTS Processing

| Test Case | Status | Priority |
|-----------|--------|----------|
| [ ] Process short text (<100 words) | | P0 |
| [ ] Process medium text (100-500 words) | | P0 |
| [ ] Process long text (>500 words) | | P0 |
| [ ] All CEFR levels (A1-C2) | | P0 |
| [ ] All voice providers (Google, Azure, Polly) | | P0 |
| [ ] Speaking rate variations (0.5x - 2x) | | P1 |
| [ ] Bilingual content generation | | P1 |
| [ ] YouTube URL processing | | P0 |
| [ ] Web page URL processing | | P0 |
| [ ] PDF file processing | | P1 |
| [ ] DOCX file processing | | P1 |
| [ ] TXT file processing | | P1 |
| [ ] Invalid input handling | | P0 |
| [ ] Usage limit enforcement | | P0 |

### AI Chat (Liro)

| Test Case | Status | Priority |
|-----------|--------|----------|
| [ ] Create new conversation | | P0 |
| [ ] Send message and receive response | | P0 |
| [ ] Multiple messages in conversation | | P0 |
| [ ] Conversation list loading | | P0 |
| [ ] Delete conversation | | P0 |
| [ ] Level-appropriate responses | | P1 |
| [ ] Message TTS generation | | P1 |
| [ ] Topic extraction | | P2 |
| [ ] Long conversation handling | | P1 |

### Books

| Test Case | Status | Priority |
|-----------|--------|----------|
| [ ] Book list loading | | P0 |
| [ ] Book search | | P0 |
| [ ] Book detail view | | P0 |
| [ ] Chapter list loading | | P0 |
| [ ] Chapter text display | | P0 |
| [ ] Chapter audio generation | | P0 |
| [ ] Audio caching (same config) | | P1 |
| [ ] Different level audio | | P1 |

### Subscription & Payments

| Test Case | Status | Priority |
|-----------|--------|----------|
| [ ] Plan list display | | P0 |
| [ ] Free plan features | | P0 |
| [ ] Paid plan features locked | | P0 |
| [ ] Apple IAP purchase | | P0 |
| [ ] Google Play purchase | | P0 |
| [ ] Subscription status update | | P0 |
| [ ] Plan upgrade | | P1 |
| [ ] Plan downgrade | | P1 |
| [ ] Subscription cancellation | | P1 |
| [ ] Receipt validation | | P0 |

### Admin Panel

| Test Case | Status | Priority |
|-----------|--------|----------|
| [ ] Dashboard loads | | P0 |
| [ ] User list with pagination | | P0 |
| [ ] User search | | P0 |
| [ ] User detail view | | P0 |
| [ ] User edit | | P0 |
| [ ] User subscription change | | P0 |
| [ ] Plan management | | P1 |
| [ ] Statistics display | | P1 |
| [ ] External service config | | P2 |

### Mobile App (iOS/Android)

| Test Case | Status | Priority |
|-----------|--------|----------|
| [ ] App launch | | P0 |
| [ ] Login flow | | P0 |
| [ ] Registration flow | | P0 |
| [ ] Dashboard display | | P0 |
| [ ] AI Chat | | P0 |
| [ ] Audio playback | | P0 |
| [ ] Push notifications | | P1 |
| [ ] IAP purchase | | P0 |
| [ ] Offline mode | | P2 |

## Cross-Browser Testing

| Browser | Windows | macOS | Status |
|---------|---------|-------|--------|
| Chrome (latest) | [ ] | [ ] | |
| Firefox (latest) | [ ] | [ ] | |
| Safari (latest) | N/A | [ ] | |
| Edge (latest) | [ ] | [ ] | |

## Performance Benchmarks

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Page load time | <3s | | |
| TTS generation (100 words) | <10s | | |
| AI Chat response | <5s | | |
| API response time (avg) | <500ms | | |

## Security Checklist

| Check | Status |
|-------|--------|
| [ ] SQL injection prevention | |
| [ ] XSS prevention | |
| [ ] CSRF protection | |
| [ ] Rate limiting active | |
| [ ] HTTPS enforced | |
| [ ] Sensitive data encryption | |
| [ ] Password hashing (bcrypt) | |
| [ ] JWT token expiration | |
| [ ] Admin routes protected | |
| [ ] File upload validation | |

## Accessibility Checklist

| Check | Status |
|-------|--------|
| [ ] Keyboard navigation | |
| [ ] Screen reader support | |
| [ ] Color contrast ratios | |
| [ ] Focus indicators | |
| [ ] Alt text for images | |
| [ ] Aria labels | |

## Regression Tests

After each release, verify:

| Area | Tests Passed |
|------|--------------|
| [ ] Authentication | |
| [ ] TTS Processing | |
| [ ] AI Chat | |
| [ ] Books | |
| [ ] Subscriptions | |
| [ ] Admin Panel | |

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Owner | | | |

## Related Documentation

- [Test Plan](./test-plan.md)
- [Worst Case Scenarios](./worst-case-scenarios.md)
- [Local Setup](../devops/local-setup.md)
