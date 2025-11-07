const axios = require('axios');
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const logger = require("../utils/logger");
const { v4: uuidv4 } = require('uuid');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const APPLE_IAP_SHARED_SECRET = process.env.APPLE_IAP_SHARED_SECRET;

// Apple's verifyReceipt endpoints
const PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

// Google Play configuration
const GOOGLE_PLAY_SERVICE_ACCOUNT_PATH = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PATH || './google-play-service-account.json';
const GOOGLE_PLAY_PACKAGE_NAME = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.nsyzk.lingrootmobile';

// Initialize Google Play API client
let androidPublisher = null;

async function getGooglePlayClient() {
  if (androidPublisher) {
    return androidPublisher;
  }

  try {
    let auth;
    
    // Option 1: Use JSON content from environment variable (for Render, Heroku, etc.)
    if (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
      logger.info('[IAP] Using Google Play service account from environment variable');
      const credentials = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
      
      auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });
    } 
    // Option 2: Use JSON file (for local development)
    else if (GOOGLE_PLAY_SERVICE_ACCOUNT_PATH) {
      const keyPath = path.resolve(GOOGLE_PLAY_SERVICE_ACCOUNT_PATH);
      
      if (!fs.existsSync(keyPath)) {
        logger.error(`[IAP] Google Play service account key not found at: ${keyPath}`);
        throw new Error('Google Play service account key not found');
      }
      
      logger.info('[IAP] Using Google Play service account from file');
      auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });
    } 
    else {
      throw new Error('Google Play service account not configured. Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON or GOOGLE_PLAY_SERVICE_ACCOUNT_PATH');
    }

    androidPublisher = google.androidpublisher({
      version: 'v3',
      auth: auth,
    });

    logger.info('[IAP] Google Play API client initialized successfully');
    return androidPublisher;
  } catch (error) {
    logger.error('[IAP] Error initializing Google Play API client:', error);
    throw error;
  }
}

/**
 * Verify Apple IAP receipt with proper sandbox/production handling
 * As per Apple's recommendation: always try production first, then sandbox if needed
 */
exports.verifyAppleReceipt = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { receiptData, productId } = req.body;
    const userId = req.user?.id;

    logger.info(`[IAP-${requestId}] ========================================`);
    logger.info(`[IAP-${requestId}] 🍎 APPLE IAP VERIFICATION STARTED`);
    logger.info(`[IAP-${requestId}] Timestamp: ${new Date().toISOString()}`);
    logger.info(`[IAP-${requestId}] User ID: ${userId}`);
    logger.info(`[IAP-${requestId}] User Email: ${req.user?.email || 'N/A'}`);
    logger.info(`[IAP-${requestId}] Product ID: ${productId}`);
    logger.info(`[IAP-${requestId}] Receipt length: ${receiptData?.length || 0} chars`);
    logger.info(`[IAP-${requestId}] Request IP: ${req.ip || req.connection?.remoteAddress || 'N/A'}`);

    if (!receiptData || !productId) {
      logger.error(`[IAP-${requestId}] Missing required fields - receiptData: ${!!receiptData}, productId: ${!!productId}`);
      return res.status(400).json({
        success: false,
        message: 'Receipt data and product ID are required'
      });
    }

    if (!APPLE_IAP_SHARED_SECRET) {
      logger.error(`[IAP-${requestId}] APPLE_IAP_SHARED_SECRET not configured in environment`);
      return res.status(500).json({
        success: false,
        message: 'IAP configuration error'
      });
    }

    // Step 1: Try production environment first (Apple's recommended approach)
    logger.info(`[IAP-${requestId}] Step 1: Attempting PRODUCTION verification`);
    logger.info(`[IAP-${requestId}] Production URL: ${PRODUCTION_URL}`);
    let verificationResult = null;
    let usedEnvironment = 'production';

    try {
      verificationResult = await verifyReceiptWithApple(receiptData, PRODUCTION_URL);
      logger.info(`[IAP-${requestId}] Production response status: ${verificationResult.status}`);
      
      // Step 2: If production returns sandbox receipt error (21007), try sandbox
      if (verificationResult.status === 21007) {
        logger.info(`[IAP-${requestId}] ⚠️ Production returned status 21007 (sandbox receipt in production)`);
        logger.info(`[IAP-${requestId}] Step 2: Switching to SANDBOX verification`);
        logger.info(`[IAP-${requestId}] Sandbox URL: ${SANDBOX_URL}`);
        verificationResult = await verifyReceiptWithApple(receiptData, SANDBOX_URL);
        usedEnvironment = 'sandbox';
        logger.info(`[IAP-${requestId}] Sandbox response status: ${verificationResult.status}`);
      }
    } catch (prodError) {
      // If production fails with network/timeout error, try sandbox as fallback
      logger.error(`[IAP-${requestId}] ❌ Production verification threw error: ${prodError.message}`);
      logger.error(`[IAP-${requestId}] Error code: ${prodError.code}`);
      logger.error(`[IAP-${requestId}] Error stack: ${prodError.stack}`);
      logger.info(`[IAP-${requestId}] Step 2: Attempting SANDBOX as fallback`);
      try {
        verificationResult = await verifyReceiptWithApple(receiptData, SANDBOX_URL);
        usedEnvironment = 'sandbox';
        logger.info(`[IAP-${requestId}] ✅ Sandbox verification succeeded with status: ${verificationResult.status}`);
      } catch (sandboxError) {
        logger.error(`[IAP-${requestId}] ❌ Sandbox verification also failed: ${sandboxError.message}`);
        logger.error(`[IAP-${requestId}] Both production and sandbox verification failed`);
        throw sandboxError;
      }
    }

    if (!verificationResult) {
      logger.error(`[IAP-${requestId}] ❌ No verification result obtained`);
      return res.status(500).json({
        success: false,
        message: 'Receipt verification failed'
      });
    }

    logger.info(`[IAP-${requestId}] ✅ Receipt verified using ${usedEnvironment.toUpperCase()} environment`);

    // Step 3: Check verification status
    if (verificationResult.status !== 0) {
      logger.error(`[IAP-${requestId}] ❌ Apple verification failed with status ${verificationResult.status}`);
      logger.error(`[IAP-${requestId}] Status message: ${getAppleStatusMessage(verificationResult.status)}`);
      logger.error(`[IAP-${requestId}] Full response: ${JSON.stringify(verificationResult, null, 2)}`);
      return res.status(400).json({
        success: false,
        message: `Receipt verification failed: ${getAppleStatusMessage(verificationResult.status)}`,
        appleStatus: verificationResult.status
      });
    }

    // Step 4: Extract latest receipt info
    logger.info(`[IAP-${requestId}] Step 3: Extracting receipt information`);
    const latestReceiptInfo = verificationResult.latest_receipt_info?.[0] || 
                              verificationResult.receipt?.in_app?.[0];

    if (!latestReceiptInfo) {
      logger.error(`[IAP-${requestId}] ❌ No receipt info found in verification response`);
      logger.error(`[IAP-${requestId}] Response structure: ${JSON.stringify(Object.keys(verificationResult), null, 2)}`);
      return res.status(400).json({
        success: false,
        message: 'No valid receipt information found'
      });
    }

    logger.info(`[IAP-${requestId}] Receipt info extracted - transaction_id: ${latestReceiptInfo.transaction_id}`);

    // Step 5: Find matching subscription plan
    logger.info(`[IAP-${requestId}] Step 4: Looking up subscription plan for product ${productId}`);
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('apple_product_id', productId)
      .single();

    if (planError || !plan) {
      logger.error(`[IAP-${requestId}] ❌ Plan not found for product ${productId}`);
      logger.error(`[IAP-${requestId}] Database error: ${JSON.stringify(planError, null, 2)}`);
      
      // Log all available plans for debugging
      const { data: allPlans } = await supabase
        .from('subscription_plans')
        .select('id, name, apple_product_id, is_active')
        .eq('is_active', true);
      
      logger.error(`[IAP-${requestId}] Available Apple product IDs in database: ${JSON.stringify(allPlans?.map(p => p.apple_product_id), null, 2)}`);
      
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found for this product ID'
      });
    }

    logger.info(`[IAP-${requestId}] ✅ Plan found: ${plan.name} (ID: ${plan.id})`)

    // Step 6: Check for existing subscription with same transaction OR original_transaction
    // Apple uses same original_transaction_id for upgrades/downgrades
    logger.info(`[IAP] Checking for existing subscription - transaction_id: ${latestReceiptInfo.transaction_id}, original_transaction_id: ${latestReceiptInfo.original_transaction_id}`);
    
    const { data: existingSub, error: existingSubError } = await supabase
      .from('subscriptions')
      .select('id, status, provider, plantype, apple_transaction_id, apple_original_transaction_id, enddate')
      .eq('user_id', userId)
      .eq('provider', 'apple')
      .or(`apple_transaction_id.eq.${latestReceiptInfo.transaction_id},apple_original_transaction_id.eq.${latestReceiptInfo.original_transaction_id}`)
      .order('enddate', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSubError) {
      logger.error(`[IAP] Error checking existing subscription:`, existingSubError);
    }

    logger.info(`[IAP] Existing subscription check result:`, existingSub ? `Found: ${JSON.stringify(existingSub)}` : 'Not found');

    if (existingSub) {
      // Check if this is the exact same transaction AND same plan
      if (existingSub.apple_transaction_id === latestReceiptInfo.transaction_id && 
          existingSub.plantype === plan.name) {
        logger.info(`[IAP] Subscription already exists for transaction ${latestReceiptInfo.transaction_id} with same plan ${plan.name}`);
        return res.status(200).json({
          success: true,
          message: 'Subscription already active',
          data: { subscriptionId: existingSub.id }
        });
      }
      
      // Same transaction but different plan OR different transaction with same original = upgrade/downgrade
      logger.info(`[IAP] 🔄 Detected upgrade/downgrade from ${existingSub.plantype} to ${plan.name}`);
      
      // Update existing subscription instead of creating new one
      const expiresDate = new Date(parseInt(latestReceiptInfo.expires_date_ms));
      const purchaseDate = new Date(parseInt(latestReceiptInfo.purchase_date_ms));
      
      const { data: updatedSub, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plantype: plan.name,
          stripepriceid: plan.id, // Link to subscription_plans for features
          status: 'active',
          startdate: purchaseDate.toISOString(),
          enddate: expiresDate.toISOString(),
          apple_transaction_id: latestReceiptInfo.transaction_id,
          apple_receipt_data: receiptData,
        })
        .eq('id', existingSub.id)
        .select()
        .single();

      if (updateError) {
        logger.error(`[IAP] Error updating subscription:`, updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update subscription'
        });
      }

      logger.info(`[IAP] Successfully upgraded/downgraded subscription ${updatedSub.id} to ${plan.name}`);
      
      return res.status(200).json({
        success: true,
        message: 'Subscription upgraded successfully',
        data: {
          subscriptionId: updatedSub.id,
          planName: plan.name,
          expiresAt: expiresDate.toISOString()
        }
      });
    }

    // Step 6.5: Deactivate all existing active subscriptions for this user
    const { data: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('id, plantype, status')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (activeSubscriptions && activeSubscriptions.length > 0) {
      logger.info(`[IAP] Found ${activeSubscriptions.length} active subscription(s) for user ${userId}, deactivating...`);
      
      const { error: deactivateError } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          enddate: new Date().toISOString() // Set end date to now
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (deactivateError) {
        logger.error(`[IAP] Error deactivating old subscriptions:`, deactivateError);
      } else {
        logger.info(`[IAP] Successfully deactivated old subscriptions for user ${userId}`);
      }
    }

    // Step 7: Create new subscription
    const expiresDate = new Date(parseInt(latestReceiptInfo.expires_date_ms));
    const purchaseDate = new Date(parseInt(latestReceiptInfo.purchase_date_ms));

    const subscriptionData = {
      user_id: userId,
      plantype: plan.name, // Use plan name as plantype
      stripepriceid: plan.id, // Link to subscription_plans for features
      provider: 'apple',
      status: 'active',
      startdate: purchaseDate.toISOString(),
      enddate: expiresDate.toISOString(),
      apple_transaction_id: latestReceiptInfo.transaction_id,
      apple_original_transaction_id: latestReceiptInfo.original_transaction_id,
      apple_receipt_data: receiptData,
      audio_creation_count: 0
    };

    const { data: newSub, error: insertError } = await supabase
      .from('subscriptions')
      .insert([subscriptionData])
      .select()
      .single();

    if (insertError) {
      logger.error(`[IAP] Error creating subscription for user ${userId}:`, insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create subscription'
      });
    }

    // Step 8: Update user role to premium
    const { error: roleError } = await supabase
      .from('users')
      .update({ role: 'premium' })
      .eq('id', userId);

    if (roleError) {
      logger.error(`[IAP] Error updating user role for user ${userId}:`, roleError);
    }

    logger.info(`[IAP-${requestId}] Successfully created subscription ${newSub.id} for user ${userId}`);
    logger.info(`[IAP-${requestId}] Plan: ${plan.name}`);
    logger.info(`[IAP-${requestId}] Expires: ${expiresDate.toISOString()}`);
    logger.info(`[IAP-${requestId}] Environment: ${usedEnvironment}`);
    logger.info(`[IAP-${requestId}] Transaction ID: ${latestReceiptInfo.transaction_id}`);
    logger.info(`[IAP-${requestId}] ========================================`);

    return res.status(200).json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        subscriptionId: newSub.id,
        planName: plan.name,
        expiresAt: expiresDate.toISOString()
      }
    });

  } catch (error) {
    logger.error(`[IAP-${requestId}] ❌❌❌ CRITICAL ERROR during Apple receipt verification`);
    logger.error(`[IAP-${requestId}] Error type: ${error.constructor.name}`);
    logger.error(`[IAP-${requestId}] Error message: ${error.message}`);
    logger.error(`[IAP-${requestId}] Error stack: ${error.stack}`);
    logger.error(`[IAP-${requestId}] User ID: ${req.user?.id}`);
    logger.error(`[IAP-${requestId}] Product ID: ${req.body?.productId}`);
    logger.error(`[IAP-${requestId}] ========================================`);
    return res.status(500).json({
      success: false,
      message: 'Server error during verification',
      error: error.message
    });
  }
};

/**
 * Helper function to verify receipt with Apple
 */
async function verifyReceiptWithApple(receiptData, url) {
  try {
    const response = await axios.post(url, {
      'receipt-data': receiptData,
      'password': APPLE_IAP_SHARED_SECRET,
      'exclude-old-transactions': true
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    logger.error(`[IAP] Error calling Apple verification API at ${url}:`, error.message);
    throw error;
  }
}

/**
 * Get human-readable message for Apple status codes
 */
function getAppleStatusMessage(status) {
  const messages = {
    21000: 'The App Store could not read the JSON object you provided.',
    21002: 'The data in the receipt-data property was malformed or missing.',
    21003: 'The receipt could not be authenticated.',
    21004: 'The shared secret you provided does not match the shared secret on file for your account.',
    21005: 'The receipt server is not currently available.',
    21006: 'This receipt is valid but the subscription has expired.',
    21007: 'This receipt is from the test environment, but it was sent to the production environment for verification.',
    21008: 'This receipt is from the production environment, but it was sent to the test environment for verification.',
    21009: 'Internal data access error.',
    21010: 'The user account cannot be found or has been deleted.'
  };

  return messages[status] || `Unknown error (status: ${status})`;
}

/**
 * Verify Google Play purchase with Google Play Developer API
 */
exports.verifyGooglePlayPurchase = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { purchaseToken, productId, packageName } = req.body;
    const userId = req.user?.id;

    logger.info(`[IAP] Google Play purchase verification started for user ${userId}, product ${productId}`);

    if (!purchaseToken || !productId) {
      return res.status(400).json({
        success: false,
        message: 'Purchase token and product ID are required'
      });
    }

    // Step 1: Verify purchase with Google Play API
    let purchaseData = null;
    try {
      const client = await getGooglePlayClient();
      const packageNameToUse = packageName || GOOGLE_PLAY_PACKAGE_NAME;
      
      logger.info(`[IAP] Verifying purchase with Google Play API - Package: ${packageNameToUse}, Product: ${productId}`);
      
      const response = await client.purchases.subscriptions.get({
        packageName: packageNameToUse,
        subscriptionId: productId,
        token: purchaseToken,
      });

      purchaseData = response.data;
      logger.info(`[IAP] Google Play API response:`, JSON.stringify(purchaseData, null, 2));

      // Check if subscription is valid
      if (!purchaseData) {
        logger.error(`[IAP] No purchase data received from Google Play API`);
        return res.status(400).json({
          success: false,
          message: 'Invalid purchase token'
        });
      }

      // Check payment state (0 = pending, 1 = received, 2 = free trial, 3 = pending deferred upgrade/downgrade)
      if (purchaseData.paymentState !== 1 && purchaseData.paymentState !== 2) {
        logger.error(`[IAP] Invalid payment state: ${purchaseData.paymentState}`);
        return res.status(400).json({
          success: false,
          message: 'Payment not completed'
        });
      }

      // Check if subscription is active (not cancelled or expired)
      const expiryTimeMillis = parseInt(purchaseData.expiryTimeMillis);
      const now = Date.now();
      
      if (expiryTimeMillis < now) {
        logger.error(`[IAP] Subscription expired at ${new Date(expiryTimeMillis).toISOString()}`);
        return res.status(400).json({
          success: false,
          message: 'Subscription has expired'
        });
      }

      logger.info(`[IAP] ✅ Purchase verified successfully with Google Play API`);
      
    } catch (apiError) {
      logger.error(`[IAP] Google Play API verification failed:`, apiError);
      
      // Check if it's a 404 (purchase not found)
      if (apiError.code === 404) {
        return res.status(404).json({
          success: false,
          message: 'Purchase not found in Google Play'
        });
      }
      
      // Check if it's an authentication error
      if (apiError.code === 401 || apiError.code === 403) {
        return res.status(500).json({
          success: false,
          message: 'Google Play API authentication failed. Please check service account configuration.'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: `Google Play API error: ${apiError.message}`
      });
    }

    // Step 2: Find matching subscription plan
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('google_product_id', productId)
      .single();

    if (planError || !plan) {
      logger.error(`[IAP] Plan not found for Google product ${productId}:`, planError);
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found for this product'
      });
    }

    logger.info(`[IAP] Found plan: ${plan.name} for product ${productId}`);

    // Step 3: Check for existing subscription with same purchase token
    const { data: existingSub, error: existingSubError } = await supabase
      .from('subscriptions')
      .select('id, status, provider, plantype, google_purchase_token, enddate')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .eq('google_purchase_token', purchaseToken)
      .order('enddate', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSubError) {
      logger.error(`[IAP] Error checking existing subscription:`, existingSubError);
    }

    if (existingSub) {
      logger.info(`[IAP] Subscription already exists for purchase token ${purchaseToken}`);
      return res.status(200).json({
        success: true,
        message: 'Subscription already active',
        data: { subscriptionId: existingSub.id }
      });
    }

    // Step 3: Deactivate all existing active subscriptions for this user
    const { data: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('id, plantype, status')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (activeSubscriptions && activeSubscriptions.length > 0) {
      logger.info(`[IAP] Found ${activeSubscriptions.length} active subscription(s) for user ${userId}, deactivating...`);
      
      const { error: deactivateError } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          enddate: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (deactivateError) {
        logger.error(`[IAP] Error deactivating old subscriptions:`, deactivateError);
      } else {
        logger.info(`[IAP] Successfully deactivated old subscriptions for user ${userId}`);
      }
    }

    // Step 4: Create new subscription
    // Use actual dates from Google Play API
    const startDate = new Date(parseInt(purchaseData.startTimeMillis));
    const endDate = new Date(parseInt(purchaseData.expiryTimeMillis));

    const subscriptionData = {
      user_id: userId,
      plantype: plan.name,
      stripepriceid: plan.id,
      provider: 'google',
      status: 'active',
      startdate: startDate.toISOString(),
      enddate: endDate.toISOString(),
      google_purchase_token: purchaseToken,
      audio_creation_count: 0
    };

    const { data: newSub, error: insertError } = await supabase
      .from('subscriptions')
      .insert([subscriptionData])
      .select()
      .single();

    if (insertError) {
      logger.error(`[IAP] Error creating subscription for user ${userId}:`, insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create subscription'
      });
    }

    // Step 5: Update user role to premium
    const { error: roleError } = await supabase
      .from('users')
      .update({ role: 'premium' })
      .eq('id', userId);

    if (roleError) {
      logger.error(`[IAP] Error updating user role for user ${userId}:`, roleError);
    }

    logger.info(`[IAP] Successfully created Google Play subscription ${newSub.id} for user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        subscriptionId: newSub.id,
        planName: plan.name,
        expiresAt: endDate.toISOString()
      }
    });

  } catch (error) {
    logger.error(`[IAP] Server error during Google Play purchase verification:`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error during verification',
      error: error.message
    });
  }
};
