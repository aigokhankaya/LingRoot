const logger = require('../utils/logger');
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Google Play Real-Time Developer Notifications (RTDN) Handler
 * Handles subscription lifecycle events from Google Play via Pub/Sub
 * 
 * Documentation: https://developer.android.com/google/play/billing/rtdn-reference
 */

// Notification type codes from Google
const NOTIFICATION_TYPES = {
  1: 'SUBSCRIPTION_RECOVERED',      // Subscription recovered from account hold
  2: 'SUBSCRIPTION_RENEWED',        // Subscription was renewed
  3: 'SUBSCRIPTION_CANCELED',       // Subscription was canceled
  4: 'SUBSCRIPTION_PURCHASED',      // New subscription purchased
  5: 'SUBSCRIPTION_ON_HOLD',        // Subscription is on hold
  6: 'SUBSCRIPTION_IN_GRACE_PERIOD', // Subscription in grace period
  7: 'SUBSCRIPTION_RESTARTED',      // Subscription restarted
  8: 'SUBSCRIPTION_PRICE_CHANGE_CONFIRMED', // Price change confirmed
  9: 'SUBSCRIPTION_DEFERRED',       // Subscription deferred
  10: 'SUBSCRIPTION_PAUSED',        // Subscription paused
  11: 'SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED', // Pause schedule changed
  12: 'SUBSCRIPTION_REVOKED',       // Subscription revoked
  13: 'SUBSCRIPTION_EXPIRED',       // Subscription expired
  20: 'SUBSCRIPTION_PENDING_PURCHASE_CANCELED' // Pending purchase canceled
};

/**
 * Main handler for Google Play RTDN via Pub/Sub push
 * Google Cloud Pub/Sub sends a POST request with the notification
 */
exports.handleGooglePlayNotification = async (req, res) => {
  const notificationId = `GPLAY-${Date.now()}`;
  
  try {
    logger.info(`[${notificationId}] 🤖 Google Play RTDN received`);
    logger.info(`[${notificationId}] Headers: ${JSON.stringify(req.headers)}`);
    
    // Pub/Sub sends the message in a specific format
    const pubsubMessage = req.body?.message;
    
    if (!pubsubMessage) {
      logger.error(`[${notificationId}] ❌ No Pub/Sub message in request`);
      logger.error(`[${notificationId}] Request body: ${JSON.stringify(req.body)}`);
      // Return 200 to prevent retries for malformed requests
      return res.status(200).json({ error: 'Missing Pub/Sub message' });
    }

    // Decode base64 data from Pub/Sub
    let notificationData;
    try {
      const decodedData = Buffer.from(pubsubMessage.data, 'base64').toString('utf-8');
      notificationData = JSON.parse(decodedData);
      logger.info(`[${notificationId}] Decoded notification: ${JSON.stringify(notificationData, null, 2)}`);
    } catch (decodeError) {
      logger.error(`[${notificationId}] ❌ Failed to decode Pub/Sub message: ${decodeError.message}`);
      return res.status(200).json({ error: 'Failed to decode message' });
    }

    // Extract subscription notification
    const subscriptionNotification = notificationData.subscriptionNotification;
    
    if (!subscriptionNotification) {
      logger.info(`[${notificationId}] ℹ️ Not a subscription notification, ignoring`);
      // Could be a test notification or one-time purchase
      return res.status(200).json({ status: 'ignored', reason: 'not_subscription_notification' });
    }

    const { 
      version,
      notificationType,
      purchaseToken,
      subscriptionId 
    } = subscriptionNotification;
    
    const packageName = notificationData.packageName;
    const eventTimeMillis = notificationData.eventTimeMillis;

    const notificationTypeName = NOTIFICATION_TYPES[notificationType] || `UNKNOWN_${notificationType}`;
    
    logger.info(`[${notificationId}] Package: ${packageName}`);
    logger.info(`[${notificationId}] Subscription ID: ${subscriptionId}`);
    logger.info(`[${notificationId}] Notification Type: ${notificationType} (${notificationTypeName})`);
    logger.info(`[${notificationId}] Purchase Token: ${purchaseToken?.substring(0, 50)}...`);
    logger.info(`[${notificationId}] Event Time: ${new Date(parseInt(eventTimeMillis)).toISOString()}`);

    // Handle different notification types
    switch (notificationType) {
      case 1: // SUBSCRIPTION_RECOVERED
        logger.info(`[${notificationId}] ✅ Subscription recovered from account hold`);
        await handleSubscriptionRecovered(notificationId, purchaseToken, subscriptionId, packageName);
        break;

      case 2: // SUBSCRIPTION_RENEWED
        logger.info(`[${notificationId}] 🔄 Subscription renewed`);
        await handleSubscriptionRenewed(notificationId, purchaseToken, subscriptionId, packageName);
        break;

      case 3: // SUBSCRIPTION_CANCELED
        logger.info(`[${notificationId}] ⚠️ Subscription canceled`);
        await handleSubscriptionCanceled(notificationId, purchaseToken);
        break;

      case 4: // SUBSCRIPTION_PURCHASED
        logger.info(`[${notificationId}] 🆕 New subscription purchased`);
        // Usually handled during initial purchase verification
        break;

      case 5: // SUBSCRIPTION_ON_HOLD
        logger.info(`[${notificationId}] ⏸️ Subscription on hold (payment issue)`);
        await handleSubscriptionOnHold(notificationId, purchaseToken);
        break;

      case 6: // SUBSCRIPTION_IN_GRACE_PERIOD
        logger.info(`[${notificationId}] ⏳ Subscription in grace period`);
        await handleSubscriptionGracePeriod(notificationId, purchaseToken);
        break;

      case 7: // SUBSCRIPTION_RESTARTED
        logger.info(`[${notificationId}] 🔄 Subscription restarted`);
        await handleSubscriptionRestarted(notificationId, purchaseToken, subscriptionId, packageName);
        break;

      case 12: // SUBSCRIPTION_REVOKED
        logger.info(`[${notificationId}] ❌ Subscription revoked`);
        await handleSubscriptionRevoked(notificationId, purchaseToken);
        break;

      case 13: // SUBSCRIPTION_EXPIRED
        logger.info(`[${notificationId}] ⏰ Subscription expired`);
        await handleSubscriptionExpired(notificationId, purchaseToken);
        break;

      default:
        logger.warn(`[${notificationId}] ⚠️ Unhandled notification type: ${notificationType} (${notificationTypeName})`);
    }

    // Always return 200 to acknowledge receipt
    logger.info(`[${notificationId}] ✅ Notification processed successfully`);
    return res.status(200).json({ status: 'received', notificationType: notificationTypeName });

  } catch (error) {
    logger.error(`[${notificationId}] ❌ Error processing notification: ${error.message}`);
    logger.error(`[${notificationId}] Stack: ${error.stack}`);
    
    // Return 200 to prevent Pub/Sub from retrying indefinitely
    return res.status(200).json({ status: 'error', message: error.message });
  }
};

// Helper function to get subscription from Google Play API and update database
async function getAndUpdateSubscriptionFromGoogle(notificationId, purchaseToken, subscriptionId, packageName) {
  try {
    const { google } = require('googleapis');
    
    let auth;
    if (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
      auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });
    } else {
      logger.error(`[${notificationId}] Google Play service account not configured`);
      return null;
    }

    const androidPublisher = google.androidpublisher({ version: 'v3', auth });
    const packageNameToUse = packageName || process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.nsyzk.lingrootmobile';

    logger.info(`[${notificationId}] Fetching subscription from Google Play API...`);
    
    const response = await androidPublisher.purchases.subscriptions.get({
      packageName: packageNameToUse,
      subscriptionId: subscriptionId,
      token: purchaseToken,
    });

    return response.data;
  } catch (error) {
    logger.error(`[${notificationId}] Error fetching from Google Play API: ${error.message}`);
    return null;
  }
}

// SUBSCRIPTION_RECOVERED - User's subscription recovered from account hold
async function handleSubscriptionRecovered(notificationId, purchaseToken, subscriptionId, packageName) {
  try {
    logger.info(`[${notificationId}] Processing subscription recovery...`);
    
    // Get latest subscription details from Google
    const purchaseData = await getAndUpdateSubscriptionFromGoogle(notificationId, purchaseToken, subscriptionId, packageName);
    
    if (purchaseData) {
      const expiryDate = new Date(parseInt(purchaseData.expiryTimeMillis));
      
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          enddate: expiryDate.toISOString(),
          google_subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('google_purchase_token', purchaseToken);

      if (error) {
        logger.error(`[${notificationId}] Failed to update subscription: ${error.message}`);
      } else {
        logger.info(`[${notificationId}] ✅ Subscription recovered, expires: ${expiryDate.toISOString()}`);
      }
    } else {
      // Fallback: just update status
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          google_subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('google_purchase_token', purchaseToken);

      if (error) {
        logger.error(`[${notificationId}] Failed to update subscription status: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error(`[${notificationId}] Error in handleSubscriptionRecovered: ${error.message}`);
  }
}

// SUBSCRIPTION_RENEWED - Subscription was automatically renewed
async function handleSubscriptionRenewed(notificationId, purchaseToken, subscriptionId, packageName) {
  try {
    logger.info(`[${notificationId}] Processing subscription renewal...`);
    
    // Get latest subscription details from Google
    const purchaseData = await getAndUpdateSubscriptionFromGoogle(notificationId, purchaseToken, subscriptionId, packageName);
    
    if (purchaseData) {
      const expiryDate = new Date(parseInt(purchaseData.expiryTimeMillis));
      const startDate = new Date(parseInt(purchaseData.startTimeMillis));
      
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          enddate: expiryDate.toISOString(),
          startdate: startDate.toISOString(),
          google_subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('google_purchase_token', purchaseToken);

      if (error) {
        logger.error(`[${notificationId}] Failed to update subscription: ${error.message}`);
      } else {
        logger.info(`[${notificationId}] ✅ Subscription renewed until: ${expiryDate.toISOString()}`);
      }
    } else {
      logger.warn(`[${notificationId}] Could not fetch subscription details from Google Play API`);
    }
  } catch (error) {
    logger.error(`[${notificationId}] Error in handleSubscriptionRenewed: ${error.message}`);
  }
}

// SUBSCRIPTION_CANCELED - User canceled their subscription
async function handleSubscriptionCanceled(notificationId, purchaseToken) {
  try {
    logger.info(`[${notificationId}] Marking subscription as canceled...`);
    
    // Subscription remains active until enddate, just mark auto-renew as disabled
    const { error } = await supabase
      .from('subscriptions')
      .update({
        google_auto_renew_status: false,
        google_subscription_status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('google_purchase_token', purchaseToken);

    if (error) {
      logger.error(`[${notificationId}] Failed to mark subscription as canceled: ${error.message}`);
    } else {
      logger.info(`[${notificationId}] ✅ Subscription marked as canceled (will remain active until period end)`);
    }
  } catch (error) {
    logger.error(`[${notificationId}] Error in handleSubscriptionCanceled: ${error.message}`);
  }
}

// SUBSCRIPTION_ON_HOLD - Payment failed, subscription on hold
async function handleSubscriptionOnHold(notificationId, purchaseToken) {
  try {
    logger.info(`[${notificationId}] Marking subscription as on hold...`);
    
    const { error } = await supabase
      .from('subscriptions')
      .update({
        google_subscription_status: 'on_hold',
        updated_at: new Date().toISOString()
      })
      .eq('google_purchase_token', purchaseToken);

    if (error) {
      logger.error(`[${notificationId}] Failed to update subscription: ${error.message}`);
    } else {
      logger.info(`[${notificationId}] ✅ Subscription marked as on hold`);
    }
  } catch (error) {
    logger.error(`[${notificationId}] Error in handleSubscriptionOnHold: ${error.message}`);
  }
}

// SUBSCRIPTION_IN_GRACE_PERIOD - Payment failed but in grace period
async function handleSubscriptionGracePeriod(notificationId, purchaseToken) {
  try {
    logger.info(`[${notificationId}] Marking subscription in grace period...`);
    
    const { error } = await supabase
      .from('subscriptions')
      .update({
        google_subscription_status: 'grace_period',
        updated_at: new Date().toISOString()
      })
      .eq('google_purchase_token', purchaseToken);

    if (error) {
      logger.error(`[${notificationId}] Failed to update subscription: ${error.message}`);
    } else {
      logger.info(`[${notificationId}] ✅ Subscription marked as in grace period`);
    }
  } catch (error) {
    logger.error(`[${notificationId}] Error in handleSubscriptionGracePeriod: ${error.message}`);
  }
}

// SUBSCRIPTION_RESTARTED - User restarted their subscription
async function handleSubscriptionRestarted(notificationId, purchaseToken, subscriptionId, packageName) {
  try {
    logger.info(`[${notificationId}] Processing subscription restart...`);
    
    // Get latest subscription details from Google
    const purchaseData = await getAndUpdateSubscriptionFromGoogle(notificationId, purchaseToken, subscriptionId, packageName);
    
    if (purchaseData) {
      const expiryDate = new Date(parseInt(purchaseData.expiryTimeMillis));
      
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          enddate: expiryDate.toISOString(),
          google_subscription_status: 'active',
          google_auto_renew_status: true,
          updated_at: new Date().toISOString()
        })
        .eq('google_purchase_token', purchaseToken);

      if (error) {
        logger.error(`[${notificationId}] Failed to update subscription: ${error.message}`);
      } else {
        logger.info(`[${notificationId}] ✅ Subscription restarted, expires: ${expiryDate.toISOString()}`);
      }
    }
  } catch (error) {
    logger.error(`[${notificationId}] Error in handleSubscriptionRestarted: ${error.message}`);
  }
}

// SUBSCRIPTION_REVOKED - Subscription revoked (e.g., refund)
async function handleSubscriptionRevoked(notificationId, purchaseToken) {
  try {
    logger.info(`[${notificationId}] Revoking subscription...`);
    
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        google_subscription_status: 'revoked',
        enddate: new Date().toISOString(), // End immediately
        updated_at: new Date().toISOString()
      })
      .eq('google_purchase_token', purchaseToken);

    if (error) {
      logger.error(`[${notificationId}] Failed to revoke subscription: ${error.message}`);
    } else {
      logger.info(`[${notificationId}] ✅ Subscription revoked`);
    }
  } catch (error) {
    logger.error(`[${notificationId}] Error in handleSubscriptionRevoked: ${error.message}`);
  }
}

// SUBSCRIPTION_EXPIRED - Subscription has expired
async function handleSubscriptionExpired(notificationId, purchaseToken) {
  try {
    logger.info(`[${notificationId}] Marking subscription as expired...`);
    
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'expired',
        google_subscription_status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('google_purchase_token', purchaseToken);

    if (error) {
      logger.error(`[${notificationId}] Failed to mark subscription as expired: ${error.message}`);
    } else {
      logger.info(`[${notificationId}] ✅ Subscription marked as expired`);
    }
  } catch (error) {
    logger.error(`[${notificationId}] Error in handleSubscriptionExpired: ${error.message}`);
  }
}

/**
 * Test endpoint to verify the webhook is working
 */
exports.testGooglePlayNotification = async (req, res) => {
  logger.info('[GPLAY-TEST] Test endpoint called');
  return res.status(200).json({ 
    status: 'ok', 
    message: 'Google Play RTDN endpoint is working',
    timestamp: new Date().toISOString()
  });
};
