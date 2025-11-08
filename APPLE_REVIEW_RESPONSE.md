# Response to Apple App Review - In-App Purchase Issue

---

**Subject:** Re: Guideline 2.1 - Performance - App Completeness - In-App Purchase Issue

---

Dear Apple App Review Team,

Thank you for your detailed feedback regarding the in-app purchase functionality in LingRoot.

## Actions Taken

Based on your guidance about handling production-signed apps with sandbox receipts, we have implemented the following improvements:

### 1. Backend Receipt Verification Enhancement

Our backend now properly handles both production and sandbox environments as recommended by Apple:

- **Step 1:** Always validates receipts against the production App Store first
- **Step 2:** If validation fails with error code 21007 ("Sandbox receipt used in production"), automatically validates against the sandbox environment
- **Step 3:** Also handles network errors by falling back to sandbox verification

This ensures seamless operation during App Review when production-signed apps receive sandbox receipts.

### 2. App Store Server Notifications Configuration

We have configured App Store Server Notifications to receive real-time updates about subscription events:

- **Production Server URL:** `https://lingloops-backend.onrender.com/api/iap/apple/notifications`
- **Sandbox Server URL:** `https://lingloops-backend.onrender.com/api/iap/apple/notifications/sandbox`

These endpoints handle subscription lifecycle events (renewals, cancellations, refunds) as per Apple's guidelines.

### 3. In-App Purchase Products Status

Both subscription products are properly configured in App Store Connect:

- **Gold Plan** (`com.lingroot.premium.monthly`) - Status: **Waiting for Review**
- **Platinum Plan** (`com.lingroot.premium.monthly.platin`) - Status: **Waiting for Review**

Both products are:
- ✅ In the same subscription group
- ✅ Available in all territories
- ✅ Properly localized (English and Turkish)
- ✅ Configured with correct pricing

### 4. StoreKit Configuration

We have included a StoreKit Configuration file (`LingRoot.storekit`) in the Xcode project to ensure in-app purchase products are available during testing, even in the review environment.

### 5. Paid Applications Agreement

The Paid Applications Agreement has been accepted and is active in App Store Connect.

## Technical Implementation Details

**Backend Receipt Validation Flow:**
```
1. Receive receipt from iOS app
2. Attempt production verification (buy.itunes.apple.com)
3. If status = 21007 → Switch to sandbox (sandbox.itunes.apple.com)
4. If network error → Fallback to sandbox
5. Process verified receipt and create/update subscription
```

**Supported Subscription Events:**
- Initial purchase (SUBSCRIBED)
- Auto-renewal (DID_RENEW)
- Renewal status changes (DID_CHANGE_RENEWAL_STATUS)
- Expiration (EXPIRED)
- Refunds (REFUND)
- Revocations (REVOKE)

## Testing Verification

We have successfully tested the complete in-app purchase flow:

1. ✅ Product discovery from App Store
2. ✅ Purchase initiation
3. ✅ Receipt validation (both production and sandbox)
4. ✅ Subscription activation in backend
5. ✅ Feature access based on subscription status
6. ✅ Server notification handling

The implementation follows Apple's best practices for receipt validation and subscription management.

## Request for Re-Review

We believe the "Product not available" error was due to the products being in "Waiting for Review" status during your initial review. Now that we have:

1. Properly configured backend to handle both environments
2. Set up App Store Server Notifications
3. Included StoreKit Configuration
4. Ensured all products are ready for review

We kindly request a re-review of the in-app purchase functionality.

If you encounter any issues during testing, please let us know the specific error messages or logs, and we will address them immediately.

## Additional Information

- **App Version:** 1.0 (Build 24)
- **iOS Deployment Target:** iOS 13.0+
- **Test Environment:** Both production and sandbox environments supported
- **Backend:** Deployed on Render (https://lingloops-backend.onrender.com)

Thank you for your patience and thorough review process. We are committed to providing a seamless user experience.

Best regards,
LingRoot Development Team

---

## Technical Resources (For Reference)

- Apple Receipt Validation: Implemented per [Apple Documentation](https://developer.apple.com/documentation/appstorereceipts/verifyreceipt)
- Server Notifications: Configured per [App Store Server Notifications](https://developer.apple.com/documentation/appstoreservernotifications)
- Subscription Management: Following [Auto-Renewable Subscriptions](https://developer.apple.com/app-store/subscriptions/) guidelines
