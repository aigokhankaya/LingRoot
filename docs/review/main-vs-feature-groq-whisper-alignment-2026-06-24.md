# Main vs `feature/groq-whisper-alignment` Review

Date: 2026-06-24

Branch under review: `feature/groq-whisper-alignment`

Comparison base: `main...HEAD`

Important note:
- `git diff main...HEAD` reported multiple merge bases and used `7795a9259c6205a17e03d60ae98551431ac3dd58`.
- This means the branch history is not a simple linear divergence from `main`.
- Before merging, it is worth validating the final diff again after a fresh rebase or merge from `main`.

## Executive Summary

This branch is much broader than a single onboarding change set.

Compared with `main`, it currently includes:
- 281 changed files
- about 50k inserted lines
- changes across mobile, backend, frontend, docs, test assets, and `.claude` automation files

Top-level change distribution:
- `.claude`: 101 files
- `backend`: 73 files
- `LingRootMobile`: 47 files
- `docs`: 25 files
- `frontend`: 14 files
- `newDesign`: 5 files
- `uploads`: 3 files

## Product Areas Changed

### 1. Mobile onboarding and player flow

Key files:
- `LingRootMobile/src/screens/StartScreen.tsx`
- `LingRootMobile/src/screens/HomeGateScreen.tsx`
- `LingRootMobile/src/navigation/AppNavigator.tsx`
- `LingRootMobile/src/screens/LibraryScreen.tsx`
- `LingRootMobile/src/screens/AudioPlayerScreen.tsx`
- `LingRootMobile/src/components/GuideTour.tsx`
- `LingRootMobile/src/services/startOnboardingService.ts`

Observed scope:
- A dedicated start onboarding flow was added/refined.
- Home tab behavior was changed to route incomplete users into onboarding.
- Audio player close behavior was changed for onboarding-specific entry paths.
- Tour/guide auto-start logic was adjusted to suppress teaching flows in onboarding-related paths.
- Notification-driven player opening now carries onboarding-aware behavior.

User-visible outcomes likely included in this area:
- hiding or limiting tab usage during onboarding
- routing back to onboarding instead of library in some flows
- onboarding step indicator redesign
- onboarding success popup timing/message updates
- original text handling improvements in audio playback

### 2. Push notifications and reminders

Key files:
- `LingRootMobile/src/services/notificationService.ios.ts`
- `LingRootMobile/src/services/notificationService.android.ts`
- `LingRootMobile/src/services/pushTokenService.ts`
- `LingRootMobile/src/screens/NotificationsScreen.tsx`
- `LingRootMobile/src/screens/NotificationDetailScreen.tsx`
- `backend/controllers/notificationController.js`
- `backend/utils/notifications/pushNotification.js`

Observed scope:
- notification handling was expanded significantly
- reminder testing/support screens were added
- notification open behavior and badge handling were changed
- admin notification formatting and delivery flow were changed

### 3. Audio generation, podcast pipeline, alignment

Key files:
- `backend/routes/ttsRoutes.js`
- `backend/controllers/ttsController.js`
- `backend/utils/audio/groqWhisperAligner.js`
- `backend/utils/audio/wordAlignmentMapper.js`
- `backend/utils/audio/podcastV2/*`
- `backend/utils/audio/podcastV3/*`
- `backend/utils/audio/googleTTSMultiSpeaker.js`
- `backend/utils/onboarding/startGeneration.js`
- `backend/tests/audio/*`

Observed scope:
- Groq Whisper alignment support was added
- podcast V2/V3 pipeline work is included
- multi-speaker synthesis and timing/merge logic changed
- onboarding generation backend helpers changed
- test coverage was added around alignment and onboarding

### 4. Auth/security and API hardening

Key files:
- `backend/controllers/authController.js`
- `backend/middleware/auth.js`
- `frontend/src/lib/auth.tsx`
- `frontend/src/pages/api/auth/me.js`
- `packages/api-client/src/http.ts`

Observed scope:
- web auth hardening commits are present in branch history
- auth middleware and auth controller changed
- API client auth behavior changed

### 5. Admin and web changes

Key files:
- `frontend/src/app/admin/notifications/page.tsx`
- `frontend/src/app/admin/users/[id]/audio/page.tsx`
- `frontend/pages/welcome.tsx`

Observed scope:
- admin notifications UI changed
- welcome page changed
- some admin user pages changed

## Commits Unique to This Branch

Recent unique commits versus `main`:

1. `de6f827` Refine onboarding and notification flows
2. `91d01ea` security: harden web auth and proxy routes
3. `0e3a068` Add Supabase security remediation and podcast V3 updates
4. `619920c` fix: update topic tree audio handling and android build config
5. `dcafa22` feat: add groq whisper alignment support
6. `24df583` feat: add model rate limiter and podcast fallback hardening
7. `f42c866` feat: refine start onboarding and tts fallback
8. `b62c148` feat: add rich formatting for admin notifications
9. `96d922b` fix: harden cold-start notification popup flow
10. `749dc15` feat: improve notification tracking and admin detail flow
11. `f461341` feat: add mobile start onboarding and trial updates
12. `91520f0` fix: update ios archive mode and apple login names
13. `e4f1176` feat: improve mobile UI flows and add codex docs
14. `a75d769` feat: add AI error notifier for TTS/OpenAI error handling
15. `24b2b34` feat: improve TTS job error handling and admin notifications
16. `054b2ae` feat: add reminder test screen and fix notification scheduling bugs
17. `c6145f6` feat: add notification system with reminder test screen

This is not a focused merge candidate. It is a multi-track branch.

## Files That Deserve Extra Review Before Merge

### High-risk runtime areas

- `LingRootMobile/src/navigation/AppNavigator.tsx`
- `LingRootMobile/src/screens/StartScreen.tsx`
- `LingRootMobile/src/screens/LibraryScreen.tsx`
- `LingRootMobile/src/components/GuideTour.tsx`
- `backend/routes/ttsRoutes.js`
- `backend/controllers/ttsController.js`
- `backend/utils/onboarding/startGeneration.js`
- `backend/controllers/authController.js`
- `backend/middleware/auth.js`

Why:
- navigation and onboarding flows are easy to regress
- notification-driven paths now branch differently depending on origin
- TTS/podcast/alignment changes affect core audio generation
- auth changes can impact all clients

### Infra / release-sensitive files

- `LingRootMobile/android/app/build.gradle`
- `LingRootMobile/ios/LingRootMobile.xcodeproj/project.pbxproj`
- `LingRootMobile/ios/LingRootMobile/Info.plist`
- `LingRootMobile/ios/LingRootMobile.xcodeproj/xcshareddata/xcschemes/LingRootMobile.xcscheme`

Why:
- these can affect archive, signing, Hermes behavior, and CI/release output

## Non-Product or Potentially Accidental Files in the Diff

These should be reviewed carefully before merging:
- `.claude/**`
- `CODEX.md`
- `2026.log`
- `21:28:38`
- `21:38:35`
- `7`
- `Feb`
- `render_log.txt`
- `security_best_practices_report.md`
- `terminal codes`
- `tests/podcastlog`
- `uploads/rls error1.png`
- `uploads/supabase_warning.csv`

These files may be useful locally, but they are unlikely to belong in a production merge by default.

## Focused Review of the Latest Onboarding Work

Files directly tied to the latest onboarding discussion:
- `LingRootMobile/src/screens/StartScreen.tsx`
- `LingRootMobile/src/screens/HomeGateScreen.tsx`
- `LingRootMobile/src/navigation/AppNavigator.tsx`
- `LingRootMobile/src/screens/LibraryScreen.tsx`
- `LingRootMobile/src/components/GuideTour.tsx`
- `backend/utils/onboarding/startGeneration.js`
- `backend/routes/ttsRoutes.js`
- `frontend/pages/welcome.tsx`

What changed in this subset:
- onboarding entry flow and gate behavior
- onboarding-specific navigation back paths
- onboarding guide/tour suppression
- notification-to-player behavior while onboarding is incomplete
- onboarding generation backend support
- onboarding-related web welcome page updates

## Merge Recommendation

Current recommendation: do not merge this branch into `main` as a single undifferentiated change set.

Safer options:
- split the branch into smaller PRs by domain
- at minimum separate:
  - onboarding/navigation UI
  - notification/reminder system
  - podcast/alignment backend
  - auth/security hardening
  - `.claude` and docs-only material
  - release/build-file updates

## Suggested Next Review Pass

Before merge:

1. Re-run the diff against an updated `main`.
2. Remove or isolate non-product/support files.
3. Review iOS release-related changes separately because Hermes/TestFlight issues are already present.
4. Smoke test these flows end-to-end:
   - onboarding all 3 steps
   - notification tap while onboarding incomplete
   - audio player close behavior from every entry path
   - library/manual player open versus notification player open
   - iOS archive/TestFlight upload
