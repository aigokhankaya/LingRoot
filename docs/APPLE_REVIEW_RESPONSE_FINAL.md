# Response to Apple App Review - Guideline 2.1 In-App Purchase Issue

**Submission ID:** 79c96179-9bdb-41e8-86d6-b798df7e68b4  
**Version:** 1.0  
**Response Date:** December 8, 2025

---

Dear App Review Team,

Thank you for your detailed feedback regarding the in-app purchase issue. We have thoroughly reviewed and resolved the problems mentioned in your rejection notice.

## Issue Resolution Summary

We have implemented Apple's recommended approach for receipt validation, and all in-app purchase functionality is now working correctly.

### 1. Receipt Validation Implementation (Fixed)

Our backend server now properly implements Apple's recommended dual-environment validation:

```
1. First attempt: Validate against Production (buy.itunes.apple.com/verifyReceipt)
2. If status code 21007 received: Automatically retry with Sandbox environment
3. Result: Both production and TestFlight/Sandbox receipts are properly validated
```

This implementation follows the exact guidance from your review:
> "The recommended approach is for your production server to always validate receipts against the production App Store first. If validation fails with the error code 'Sandbox receipt used in production,' you should validate against the test environment instead."

### 2. Verified Working Components

✅ **Backend Receipt Verification:**
- Production environment validation: Working
- Sandbox environment fallback: Working  
- Status 21007 handling: Implemented and tested

✅ **In-App Purchase Products:**
- Gold Plan (`com.lingroot.premium.monthly`): Ready to Submit
- Platinum Plan (`com.lingroot.premium.monthly.platin`): Ready to Submit
- Both products properly configured with pricing and localizations

✅ **Agreements & Configuration:**
- Paid Applications Agreement: Active
- Banking & Tax Information: Complete
- App Store Connect configuration: Verified

### 3. Successful Testing Results

We have extensively tested the in-app purchase flow:

| Test Environment | Result |
|------------------|--------|
| TestFlight (Internal) | ✅ Products load, purchase completes successfully |
| TestFlight (External) | ✅ Products load, purchase completes successfully |
| Sandbox Test Users | ✅ Multiple successful purchases verified |
| iPad Simulator | ✅ Products display correctly |

**Specific iPad Air Testing:**
Since your review was conducted on iPad Air (5th generation), we have specifically tested on iPad models to ensure compatibility.

### 4. Changes Made in This Build

1. **Receipt Validation Logic**: Enhanced to properly detect and handle sandbox receipts when app is signed for production but tested in review/sandbox environment

2. **Error Handling**: Improved error messages for debugging purposes

3. **Logging**: Comprehensive logging added for receipt verification process to aid in troubleshooting

## Testing Instructions for Review

1. Open the app and navigate to **Profile** → **Membership** (or **Packages**)
2. You will see available subscription plans (Gold and Platinum)
3. Tap on any plan to initiate purchase
4. Complete the purchase using your Sandbox test account
5. The purchase should complete successfully and subscription should be activated

## Additional Information

- **Bundle ID:** com.lingroot.mobile
- **Apple App ID:** 6753145745
- **Build Number:** [Current Build]

## Support Request

We are confident that all issues have been resolved. However, if you encounter any issues during re-review, please let us know the specific error message displayed, and we will address it immediately.

We are also available for a phone call with App Review if that would help expedite the resolution.

Thank you for your patience and guidance.

Best regards,  
LingRoot Development Team
