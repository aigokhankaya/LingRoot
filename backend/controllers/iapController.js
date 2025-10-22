const axios = require('axios');
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const logger = require("../utils/logger");
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const APPLE_IAP_SHARED_SECRET = process.env.APPLE_IAP_SHARED_SECRET;

// Apple's verifyReceipt endpoints
const PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

/**
 * Verify Apple IAP receipt with proper sandbox/production handling
 * As per Apple's recommendation: always try production first, then sandbox if needed
 */
exports.verifyAppleReceipt = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { receiptData, productId } = req.body;
    const userId = req.user?.id;

    logger.info(`[IAP] Apple receipt verification started for user ${userId}, product ${productId}`);

    if (!receiptData || !productId) {
      return res.status(400).json({
        success: false,
        message: 'Receipt data and product ID are required'
      });
    }

    if (!APPLE_IAP_SHARED_SECRET) {
      logger.error('[IAP] APPLE_IAP_SHARED_SECRET not configured');
      return res.status(500).json({
        success: false,
        message: 'IAP configuration error'
      });
    }

    // Step 1: Try production environment first
    logger.info(`[IAP] Attempting production verification for user ${userId}`);
    let verificationResult = await verifyReceiptWithApple(receiptData, PRODUCTION_URL);

    // Step 2: If production returns sandbox receipt error (21007), try sandbox
    if (verificationResult.status === 21007) {
      logger.info(`[IAP] Production returned sandbox receipt (21007), trying sandbox for user ${userId}`);
      verificationResult = await verifyReceiptWithApple(receiptData, SANDBOX_URL);
    }

    // Step 3: Check verification status
    if (verificationResult.status !== 0) {
      logger.error(`[IAP] Apple verification failed with status ${verificationResult.status} for user ${userId}`);
      return res.status(400).json({
        success: false,
        message: `Receipt verification failed: ${getAppleStatusMessage(verificationResult.status)}`,
        appleStatus: verificationResult.status
      });
    }

    // Step 4: Extract latest receipt info
    const latestReceiptInfo = verificationResult.latest_receipt_info?.[0] || 
                              verificationResult.receipt?.in_app?.[0];

    if (!latestReceiptInfo) {
      logger.error(`[IAP] No receipt info found for user ${userId}`);
      return res.status(400).json({
        success: false,
        message: 'No valid receipt information found'
      });
    }

    // Step 5: Find matching subscription plan
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('apple_product_id', productId)
      .single();

    if (planError || !plan) {
      logger.error(`[IAP] Plan not found for product ${productId}:`, planError);
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    // Step 6: Check for existing subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', userId)
      .eq('apple_transaction_id', latestReceiptInfo.transaction_id)
      .maybeSingle();

    if (existingSub) {
      logger.info(`[IAP] Subscription already exists for transaction ${latestReceiptInfo.transaction_id}`);
      return res.status(200).json({
        success: true,
        message: 'Subscription already active',
        data: { subscriptionId: existingSub.id }
      });
    }

    // Step 7: Create or update subscription
    const expiresDate = new Date(parseInt(latestReceiptInfo.expires_date_ms));
    const purchaseDate = new Date(parseInt(latestReceiptInfo.purchase_date_ms));

    const subscriptionData = {
      user_id: userId,
      plan_id: plan.id,
      status: 'active',
      current_period_end: expiresDate.toISOString(),
      current_period_start: purchaseDate.toISOString(),
      apple_transaction_id: latestReceiptInfo.transaction_id,
      apple_original_transaction_id: latestReceiptInfo.original_transaction_id,
      apple_receipt_data: receiptData,
      cancel_at_period_end: false
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

    logger.info(`[IAP] Successfully created subscription ${newSub.id} for user ${userId}`);

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
    logger.error(`[IAP] Server error during Apple receipt verification:`, error);
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
