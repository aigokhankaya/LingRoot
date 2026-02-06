# Hard-Coded String Audit: `language === 'tr'` Patterns

> **Created:** 2026-01-31 | **Updated:** 2026-01-31 | **Version:** 1.0

## Summary

A total of **460 hard-coded** `language === 'tr'` / `lang === 'tr'` ternary patterns were detected across the codebase. These inline conditionals bypass the existing `t()` i18n infrastructure provided by `LanguageContext`.

| Layer | Files | Occurrences |
|-------|-------|-------------|
| Mobile (`LingRootMobile/`) | 31 | 453 |
| Frontend (`frontend/`) | 2 | 6 |
| Backend (`backend/`) | 1 | 1 |
| **Total** | **34** | **460** |

> **Note:** `UsageEstimateCard.tsx` had 15 hard-coded UI ternaries which have been migrated to `t()` in this sprint. The 2 remaining occurrences are `Intl.DateTimeFormat` locale tags (`'tr-TR'` / `'en-US'`), which are not translatable strings.

---

## Mobile (`LingRootMobile/`) - 453 occurrences across 31 files

| # | File | Count |
|---|------|-------|
| 1 | `src/screens/VocabularyScreen.tsx` | 49 |
| 2 | `src/screens/TopicTreeScreen.tsx` | 42 |
| 3 | `src/screens/PackagesScreen.tsx` | 31 |
| 4 | `src/screens/CreateScreen.tsx` | 29 |
| 5 | `src/components/AudioPlayer.tsx` | 28 |
| 6 | `src/screens/LoginScreen.tsx` | 26 |
| 7 | `src/screens/LiroScreen.tsx` | 26 |
| 8 | `src/screens/HomeScreen.tsx` | 24 |
| 9 | `src/screens/AccountSettingsScreen.tsx` | 22 |
| 10 | `src/screens/ReminderSettingsScreen.tsx` | 22 |
| 11 | `src/screens/ProfileScreen.tsx` | 17 |
| 12 | `src/services/iap.ts` | 16 |
| 13 | `src/screens/TtsProviderSettingsScreen.tsx` | 16 |
| 14 | `src/screens/RegisterScreen.tsx` | 14 |
| 15 | `src/screens/LibraryScreen.tsx` | 14 |
| 16 | `src/components/chat/ContentFormatPicker.tsx` | 12 |
| 17 | `src/services/notificationService.ios.ts` | 12 |
| 18 | `src/screens/ForgotPasswordScreen.tsx` | 11 |
| 19 | `src/screens/ChatScreen.tsx` | 11 |
| 20 | `src/components/chat/SmartPromptSuggester.tsx` | 8 |
| 21 | `src/navigation/AppNavigator.tsx` | 5 |
| 22 | `src/components/chat/DailyTopicCard.tsx` | 4 |
| 23 | `src/components/chat/ContinueBanner.tsx` | 3 |
| 24 | `src/screens/MembershipScreen.tsx` | 3 |
| 25 | `src/components/UsageEstimateCard.tsx` | 2 (locale tags only) |
| 26 | `src/components/chat/InlineAudioCard.tsx` | 1 |
| 27 | `src/screens/TermsOfServiceScreen.tsx` | 1 |
| 28 | `src/screens/PrivacyPolicyScreen.tsx` | 1 |
| 29 | `src/screens/PatternListScreen.tsx` | 1 |
| 30 | `src/utils/voiceDisplayNames.ts` | 1 |
| 31 | `FACEBOOK_LOGIN_SETUP.md` | 1 (documentation, not code) |

## Frontend (`frontend/`) - 6 occurrences across 2 files

| File | Count |
|------|-------|
| `src/lib/auth.tsx` | 2 |
| `pages/index-backup-2025-11-01.tsx` | 4 |

## Backend (`backend/`) - 1 occurrence across 1 file

| File | Count |
|------|-------|
| `controllers/patternController.js` | 1 |

---

## Top 10 Most Dense Files

| Rank | File | Count |
|------|------|-------|
| 1 | `VocabularyScreen.tsx` | 49 |
| 2 | `TopicTreeScreen.tsx` | 42 |
| 3 | `PackagesScreen.tsx` | 31 |
| 4 | `CreateScreen.tsx` | 29 |
| 5 | `AudioPlayer.tsx` | 28 |
| 6 | `LoginScreen.tsx` | 26 |
| 7 | `LiroScreen.tsx` | 26 |
| 8 | `HomeScreen.tsx` | 24 |
| 9 | `AccountSettingsScreen.tsx` | 22 |
| 10 | `ReminderSettingsScreen.tsx` | 22 |

---

## Recommendation

The existing `t()` function from `LanguageContext` (with `{{variable}}` interpolation support) is already available across all mobile components. Migration strategy:

1. **Phase 1 (Done):** `UsageEstimateCard.tsx` - 15 ternaries migrated to `t()` calls with new `usage.*` locale keys.
2. **Phase 2:** Migrate the top 10 densest files (covers ~299 occurrences / ~66% of total).
3. **Phase 3:** Remaining 20 files (~154 occurrences).
4. **Phase 4:** Frontend and backend files (7 occurrences).

Each phase should add corresponding keys to `en.json` and `tr.json` locale files before updating the component code.
