# LingRoot Security Audit Report

**Date:** March 2025
**Scope:** Backend, Frontend (Web), Mobile App
**Auditor:** Jules (AI Assistant)

---

## 1. Executive Summary

A comprehensive security audit was performed on the LingRoot codebase. The application demonstrates a strong security posture in several key areas, particularly in Rate Limiting, CORS configuration, and Password Hashing. However, several vulnerabilities were identified related to client-side token storage, dependency management, and potential fail-open states in authentication logic.

**Overall Risk Level:** **Medium**

The most critical issues involve how authentication tokens are stored on the client side, which could lead to session hijacking if an XSS vulnerability were to be exploited or if a mobile device is compromised.

---

## 2. Methodology

The audit was conducted using the following methods:
-   **Static Code Analysis:** Manual review of source code (`backend/`, `frontend/`, `LingRootMobile/`).
-   **Dependency Analysis:** Review of `package.json` files for outdated or deprecated packages.
-   **Configuration Review:** Inspection of `.env.example`, `server.js`, and middleware configurations.
-   **Pattern Matching:** Searching for hardcoded secrets ("grep") and dangerous functions (`dangerouslySetInnerHTML`).

---

## 3. Findings Summary

| ID | Category | Vulnerability | Severity | Status |
|----|----------|---------------|----------|--------|
| V-01 | Client-Side Storage | Insecure Token Storage (Frontend) | High | ⚠️ Open |
| V-02 | Client-Side Storage | Insecure Token Storage (Mobile) | High | ⚠️ Open |
| V-03 | Dependencies | Deprecated Security Package (`xss-clean`) | Medium | ⚠️ Open |
| V-04 | Authentication | Redis Blacklist Fail-Open Logic | Medium | ⚠️ Open |
| V-05 | Input Validation | Limited Input Validation (Regex) | Medium | ⚠️ Open |
| V-06 | Information Disclosure | User Enumeration (Timing/Logic) | Low | ℹ️ Info |
| V-07 | Authentication | Secure Password Hashing | - | ✅ Safe |
| V-08 | Infrastructure | Rate Limiting & DoS Protection | - | ✅ Safe |

---

## 4. Detailed Findings

### 🔴 High Severity

#### V-01: Insecure Token Storage (Frontend)
-   **Location:** `frontend/src/` (Multiple files using `localStorage.getItem('lingroot_token')`)
-   **Description:** JWT access tokens are stored in `localStorage`.
-   **Risk:** `localStorage` is accessible by any JavaScript running on the page. If an attacker discovers a Cross-Site Scripting (XSS) vulnerability, they can steal the token and hijack the user session.
-   **Recommendation:** Store tokens in **HttpOnly, Secure, SameSite cookies**. These cannot be accessed via JavaScript, mitigating the impact of XSS.

#### V-02: Insecure Token Storage (Mobile)
-   **Location:** `LingRootMobile/src/` (Using `AsyncStorage`)
-   **Description:** JWT tokens are stored using `AsyncStorage`.
-   **Risk:** On Android, `AsyncStorage` saves data to an unencrypted XML file. On iOS, it uses a plist. Malware or an attacker with physical access (especially on rooted/jailbroken devices) can easily extract these tokens.
-   **Recommendation:** Use **`expo-secure-store`** or `react-native-encrypted-storage` to store sensitive tokens using the device's Keychain/Keystore.

### 🟠 Medium Severity

#### V-03: Deprecated Security Package
-   **Location:** `backend/package.json`
-   **Description:** The project uses `xss-clean` version `0.1.1`. This package has not been updated in years and is considered deprecated.
-   **Risk:** It may not protect against modern XSS vectors or might introduce its own vulnerabilities.
-   **Recommendation:** Replace `xss-clean` with **`express-mongo-sanitize`** (already in package.json but verify usage) and validate input using a schema library like **Joi** or **Zod** which naturally prevents XSS by enforcing strict types.

#### V-04: Redis Blacklist Fail-Open Logic
-   **Location:** `backend/middleware/auth.js`
-   **Description:** The `isTokenBlacklisted` function wraps the Redis call in a try-catch block that returns `false` (not blacklisted) if an error occurs.
    ```javascript
    try {
        // redis get...
    } catch {
        return false; // Fail open
    }
    ```
-   **Risk:** If the Redis service goes down, previously revoked tokens (e.g., from a logged-out user) will become valid again until they expire naturally.
-   **Recommendation:** Implement a "Fail Closed" strategy for critical security checks, or ensure the JWT expiry time is very short (e.g., 5-15 minutes) to minimize the window of opportunity.

#### V-05: Limited Input Validation
-   **Location:** `backend/controllers/authController.js`
-   **Description:** Input validation relies on simple Regex checks for email and passwords.
-   **Risk:** Regex can be fragile and hard to maintain. It may miss edge cases or allow malformed input that could be processed by the database.
-   **Recommendation:** Adopt a robust validation library like **Zod** or **Joi**. Define schemas for all request bodies to whitelist allowed characters and types.

### 🟡 Low Severity / Informational

#### V-06: User Enumeration
-   **Location:** `backend/controllers/authController.js`
-   **Description:** The `forgotPassword` endpoint correctly returns a generic message ("If the email exists..."). However, the `login` endpoint attempts to mitigate enumeration but has potential timing discrepancies between "User not found" (early return) and "Wrong password" (after bcrypt comparison).
-   **Recommendation:** Use `fake` password comparison when a user is not found to ensure the response time is identical for both scenarios.

---

## 5. Security Strengths (What is done well)

-   **Rate Limiting:** The application has a very granular and robust Rate Limiting strategy (`security.js`) covering Auth, Chat, TTS, and Gamification endpoints.
-   **Secrets Management:** The application correctly checks for weak/missing secrets in production and exits if they are not secure. Hardcoded secrets were not found in the source code.
-   **Password Hashing:** `bcrypt` with salt rounds (10) is used, which is industry standard.
-   **Helmet & CORS:** Security headers and CORS are properly configured with strict allowlists.
-   **SQL Injection:** Use of Supabase SDK (PostgreSQL) prevents standard SQL injection attacks via parameterization.

---

## 6. Action Plan

1.  **Immediate:** Migrate Mobile storage to `expo-secure-store`.
2.  **Short-term:** Refactor Frontend auth to use HttpOnly cookies or keep tokens in memory (and refresh via cookie).
3.  **Medium-term:** Replace `xss-clean` and implement Zod/Joi validation schemas for all API inputs.
