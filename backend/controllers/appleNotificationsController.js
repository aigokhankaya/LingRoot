const logger = require('../utils/common/logger.js');
const { supabase } = require('../utils/storage/supabaseClient.js');
const crypto = require('crypto');

/**
 * Verify Apple JWS signedPayload using x5c certificate chain.
 * Returns decoded payload if valid, throws if verification fails.
 */
async function verifyAppleJWS(signedPayload) {
  const parts = signedPayload.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWS format');
  }

  // Decode header to get x5c certificate chain
  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
  const x5c = header.x5c;

  if (!x5c || !Array.isArray(x5c) || x5c.length === 0) {
    throw new Error('Missing x5c certificate chain in JWS header');
  }

  // Build PEM from the leaf certificate (first in chain)
  const leafCertPem = `-----BEGIN CERTIFICATE-----\n${x5c[0]}\n-----END CERTIFICATE-----`;

  // Extract public key from leaf certificate
  const leafCert = new crypto.X509Certificate(leafCertPem);

  // Verify the issuer is Apple
  if (!leafCert.issuer.includes('Apple')) {
    throw new Error('Certificate not issued by Apple');
  }

  // Verify the JWS signature using the leaf certificate's public key
  const signatureInput = `${parts[0]}.${parts[1]}`;
  const signature = Buffer.from(parts[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const publicKey = leafCert.publicKey;

  const isValid = crypto.verify(
    header.alg === 'ES256' ? 'SHA256' : 'SHA384',
    Buffer.from(signatureInput),
    { key: publicKey, dsaEncoding: 'ieee-p1363' },
    signature
  );

  if (!isValid) {
    throw new Error('JWS signature verification failed');
  }

  // Decode and return the payload
  return JSON.parse(Buffer.from(parts[1], 'base64').toString());
}

/**
 * Apple App Store Server Notifications V2 Handler
 * Handles subscription lifecycle events from Apple
 * 
 * Documentation: https://developer.apple.com/documentation/appstoreservernotifications
 */
exports.handleAppleNotification = async (req, res) => {
  const notificationId = `NOTIF-${Date.now()}`;
  
  try {
    logger.info(`[${notificationId}] 🍎 Apple Server Notification received`);
    logger.info(`[${notificationId}] Headers: ${JSON.stringify(req.headers)}`);
    logger.info(`[${notificationId}] Body: ${JSON.stringify(req.body, null, 2)}`);

    const { signedPayload } = req.body;

    if (!signedPayload) {
      logger.error(`[${notificationId}] ❌ No signedPayload in request`);
      return res.status(400).json({ error: 'Missing signedPayload' });
    }

    // Verify the JWS signature using Apple's certificate chain
    let payloadData;
    try {
      payloadData = await verifyAppleJWS(signedPayload);
    } catch (verifyError) {
      logger.error(`[${notificationId}] JWS verification failed: ${verifyError.message}`);
      return res.status(403).json({ error: 'Signature verification failed' });
    }
    logger.info(`[${notificationId}] Decoded payload: ${JSON.stringify(payloadData, null, 2)}`);

    const { notificationType, subtype, data } = payloadData;

    logger.info(`[${notificationId}] Notification Type: ${notificationType}`);
    logger.info(`[${notificationId}] Subtype: ${subtype || 'N/A'}`);

    // Extract transaction info
    const transactionInfo = data?.signedTransactionInfo;
    if (transactionInfo) {
      const transactionParts = transactionInfo.split('.');
      if (transactionParts.length === 3) {
        const transaction = JSON.parse(Buffer.from(transactionParts[1], 'base64').toString());
        logger.info(`[${notificationId}] Transaction: ${JSON.stringify(transaction, null, 2)}`);
        
        const { originalTransactionId, productId, expiresDate } = transaction;

        // Handle different notification types
        switch (notificationType) {
          case 'SUBSCRIBED':
            logger.info(`[${notificationId}] ✅ New subscription: ${productId}`);
            // Subscription already created during purchase verification
            break;

          case 'DID_RENEW':
            logger.info(`[${notificationId}] 🔄 Subscription renewed: ${productId}`);
            await handleSubscriptionRenewal(notificationId, originalTransactionId, productId, expiresDate);
            break;

          case 'DID_CHANGE_RENEWAL_STATUS':
            logger.info(`[${notificationId}] 🔄 Renewal status changed`);
            if (subtype === 'AUTO_RENEW_DISABLED') {
              logger.info(`[${notificationId}] ⚠️ Auto-renew disabled for: ${productId}`);
              await handleAutoRenewDisabled(notificationId, originalTransactionId);
            } else if (subtype === 'AUTO_RENEW_ENABLED') {
              logger.info(`[${notificationId}] ✅ Auto-renew enabled for: ${productId}`);
              await handleAutoRenewEnabled(notificationId, originalTransactionId);
            }
            break;

          case 'EXPIRED':
            logger.info(`[${notificationId}] ⏰ Subscription expired: ${productId}`);
            await handleSubscriptionExpired(notificationId, originalTransactionId);
            break;

          case 'REFUND':
            logger.info(`[${notificationId}] 💰 Refund issued for: ${productId}`);
            await handleRefund(notificationId, originalTransactionId);
            break;

          case 'REVOKE':
            logger.info(`[${notificationId}] ❌ Subscription revoked: ${productId}`);
            await handleSubscriptionRevoked(notificationId, originalTransactionId);
            break;

          case 'PRICE_INCREASE':
            logger.info(`[${notificationId}] 💵 Price increase notification for: ${productId}`);
            // Just log, no action needed
            break;

          default:
            logger.warn(`[${notificationId}] ⚠️ Unhandled notification type: ${notificationType}`);
        }
      }
    }

    // Always return 200 to acknowledge receipt
    logger.info(`[${notificationId}] ✅ Notification processed successfully`);
    return res.status(200).json({ status: 'received' });

  } catch (error) {
    logger.error(`[${notificationId}] ❌ Error processing notification: ${error.message}`);
    logger.error(`[${notificationId}] Stack: ${error.stack}`);
    
    // Still return 200 to prevent Apple from retrying
    return res.status(200).json({ status: 'error', message: error.message });
  }
};

/**
 * Sandbox notification handler (same logic, different logging)
 */
exports.handleAppleSandboxNotification = async (req, res) => {
  const notificationId = `SANDBOX-${Date.now()}`;
  logger.info(`[${notificationId}] 🧪 SANDBOX notification received`);
  
  // Use the same handler but with different ID
  req.notificationId = notificationId;
  return exports.handleAppleNotification(req, res);
};

// Helper functions for handling specific events

async function handleSubscriptionRenewal(notificationId, transactionId, productId, expiresDate) {
  try {
    logger.info(`[${notificationId}] Updating subscription renewal for transaction: ${transactionId}`);
    
    // Find subscription by apple_transaction_id
    const { data: subscription, error: findError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('apple_transaction_id', transactionId)
      .single();

    if (findError || !subscription) {
      logger.error(`[${notificationId}] Subscription not found for transaction: ${transactionId}`);
      return;
    }

    // Update expiration date
    let newEndDateMs = parseInt(expiresDate);
    
    // SANDBOX TEST: Extend expiration to 2 days for testing
    // Apple Sandbox subscriptions expire in 5 minutes, but we extend them for testing
    if (subscription.environment === 'Sandbox') {
      const originalExpires = new Date(newEndDateMs);
      const extendedExpires = new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)); // 2 days from now
      logger.info(`[${notificationId}] 🧪 SANDBOX MODE: Extending renewal from ${originalExpires.toISOString()} to ${extendedExpires.toISOString()}`);
      newEndDateMs = extendedExpires.getTime();
    }
    
    const newEndDate = new Date(newEndDateMs);
    
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        enddate: newEndDate.toISOString(),
        expires_at: newEndDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) {
      logger.error(`[${notificationId}] Failed to update subscription: ${updateError.message}`);
    } else {
      logger.info(`[${notificationId}] ✅ Subscription renewed until: ${newEndDate.toISOString()}`);
    }
  } catch (error) {
    logger.error(`[${notificationId}] Error in handleSubscriptionRenewal: ${error.message}`);
  }
}

async function handleAutoRenewDisabled(notificationId, transactionId) {
  try {
    logger.info(`[${notificationId}] Marking auto-renew as disabled for: ${transactionId}`);
    
    const { error } = await supabase
      .from('subscriptions')
      .update({
        apple_auto_renew_status: false,
        updated_at: new Date().toISOString()
      })
      .eq('apple_transaction_id', transactionId);

    if (error) {
      logger.error(`[${notificationId}] Failed to update auto-renew status: ${error.message}`);
    } else {
      logger.info(`[${notificationId}] ✅ Auto-renew disabled`);
    }
  } catch (error) {
    logger.error(`[${notificationId}] Error in handleAutoRenewDisabled: ${error.message}`);
  }
}

async function handleAutoRenewEnabled(notificationId, transactionId) {
  try {
    logger.info(`[${notificationId}] Marking auto-renew as enabled for: ${transactionId}`);
    
    const { error } = await supabase
      .from('subscriptions')
      .update({
        apple_auto_renew_status: true,
        updated_at: new Date().toISOString()
      })
      .eq('apple_transaction_id', transactionId);

    if (error) {
      logger.error(`[${notificationId}] Failed to update auto-renew status: ${error.message}`);
    } else {
      logger.info(`[${notificationId}] ✅ Auto-renew enabled`);
    }
  } catch (error) {
    logger.error(`[${notificationId}] Error in handleAutoRenewEnabled: ${error.message}`);
  }
}

async function handleSubscriptionExpired(notificationId, transactionId) {
  try {
    logger.info(`[${notificationId}] Marking subscription as expired for: ${transactionId}`);
    
    const { error } = await supabase
      .from('subscriptions')
      .update({
        apple_subscription_status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('apple_transaction_id', transactionId);

    if (error) {
      logger.error(`[${notificationId}] Failed to mark subscription as expired: ${error.message}`);
    } else {
      logger.info(`[${notificationId}] ✅ Subscription marked as expired`);
    }
  } catch (error) {
    logger.error(`[${notificationId}] Error in handleSubscriptionExpired: ${error.message}`);
  }
}

async function handleRefund(notificationId, transactionId) {
  try {
    logger.info(`[${notificationId}] Processing refund for: ${transactionId}`);
    
    const { error } = await supabase
      .from('subscriptions')
      .update({
        apple_subscription_status: 'refunded',
        enddate: new Date().toISOString(), // End subscription immediately
        updated_at: new Date().toISOString()
      })
      .eq('apple_transaction_id', transactionId);

    if (error) {
      logger.error(`[${notificationId}] Failed to process refund: ${error.message}`);
    } else {
      logger.info(`[${notificationId}] ✅ Refund processed, subscription ended`);
    }
  } catch (error) {
    logger.error(`[${notificationId}] Error in handleRefund: ${error.message}`);
  }
}

async function handleSubscriptionRevoked(notificationId, transactionId) {
  try {
    logger.info(`[${notificationId}] Revoking subscription for: ${transactionId}`);
    
    const { error } = await supabase
      .from('subscriptions')
      .update({
        apple_subscription_status: 'revoked',
        enddate: new Date().toISOString(), // End subscription immediately
        updated_at: new Date().toISOString()
      })
      .eq('apple_transaction_id', transactionId);

    if (error) {
      logger.error(`[${notificationId}] Failed to revoke subscription: ${error.message}`);
    } else {
      logger.info(`[${notificationId}] ✅ Subscription revoked`);
    }
  } catch (error) {
    logger.error(`[${notificationId}] Error in handleSubscriptionRevoked: ${error.message}`);
  }
}
