const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');

const APPLE_PROD_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

function pickLatestByExpiry(items = []) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items
    .map(i => ({ ...i, _expires: Number(i.expires_date_ms || i.expires_date) || 0 }))
    .sort((a, b) => (b._expires - a._expires))[0];
}

function normalizeAppleStatus(latest, nowMs) {
  const expires = Number(latest?.expires_date_ms || 0);
  if (!expires) return { status: 'inactive', isActive: false };
  if (expires > nowMs) return { status: 'active', isActive: true };
  return { status: 'expired', isActive: false };
}

async function upsertAppleSubscription({ userId, productId, originalTxId, latestTxId, expiresAtIso, environment, planId }) {
  // Prefer normalized columns; fall back to legacy ones with pruning if needed
  const basePayload = {
    user_id: userId,
    provider: 'apple',
    product_id: productId,
    apple_original_transaction_id: originalTxId,
    apple_latest_transaction_id: latestTxId,
    expires_at: expiresAtIso,
    status: 'active',
    environment: environment || null,
    startdate: new Date().toISOString(),
    enddate: expiresAtIso,
    updated_at: new Date().toISOString(),
  };
  if (planId) {
    basePayload.plan_id = planId;
  }

  // Attempt to find an existing Apple sub for this user by original_tx or product
  const existing = await supabase
    .from('subscriptions')
    .select('id, apple_original_transaction_id, provider, product_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const targetId = existing?.data?.id || null;

  async function applyWithPrune(op, payload, maxRetries = 6) {
    let attempt = 0;
    let working = { ...payload };
    let lastError = null;

    const extractMissing = (msg) => {
      const s = String(msg || '');
      let m = s.match(/column\s+\"?([a-zA-Z0-9_]+)\"?\s+does not exist/i);
      if (m) return m[1];
      m = s.match(/Could not find the '([a-zA-Z0-9_]+)' column/i);
      if (m) return m[1];
      m = s.match(/column\s+'([a-zA-Z0-9_]+)'\s+does not exist/i);
      if (m) return m[1];
      return null;
    };

    while (attempt <= maxRetries) {
      const res = await op(working);
      if (!res.error) return res;
      lastError = res.error;
      const missing = extractMissing(lastError.message);
      if (!missing) break;
      // do not remove fundamental keys
      if (['user_id'].includes(missing)) break;
      delete working[missing];
      attempt += 1;
    }
    return { data: null, error: lastError };
  }

  if (targetId) {
    const updateOp = (payload) => supabase
      .from('subscriptions')
      .update(payload)
      .eq('id', targetId)
      .select()
      .single();
    return applyWithPrune(updateOp, basePayload);
  } else {
    const insertOp = (payload) => supabase
      .from('subscriptions')
      .insert([payload])
      .select()
      .single();
    return applyWithPrune(insertOp, basePayload);
  }
}

exports.verifyAppleReceipt = async (req, res) => {
  const requestId = `APPLE-${Date.now()}`;
  const userId = req.user?.id;
  const { receiptData, productId } = req.body || {};
  const bundleIdExpected = process.env.IOS_BUNDLE_ID || 'com.lingroot.mobile';
  const sharedSecret = process.env.APPLE_IAP_SHARED_SECRET;

  logger.info(`[${requestId}] ========================================`);
  logger.info(`[${requestId}] 🍎 APPLE IAP VERIFICATION (appleIAPController)`);
  logger.info(`[${requestId}] Timestamp: ${new Date().toISOString()}`);
  logger.info(`[${requestId}] User ID: ${userId}`);
  logger.info(`[${requestId}] User Email: ${req.user?.email || 'N/A'}`);
  logger.info(`[${requestId}] Product ID: ${productId}`);
  logger.info(`[${requestId}] Receipt length: ${receiptData?.length || 0}`);

  if (!userId) {
    logger.error(`[${requestId}] ❌ Unauthorized - no user ID`);
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  if (!receiptData || !productId) {
    logger.error(`[${requestId}] ❌ Missing required fields - receiptData: ${!!receiptData}, productId: ${!!productId}`);
    return res.status(400).json({ success: false, message: 'receiptData and productId are required' });
  }
  if (!sharedSecret) {
    logger.error(`[${requestId}] ❌ APPLE_IAP_SHARED_SECRET is not set in environment`);
    return res.status(500).json({ success: false, message: 'Server not configured for Apple IAP' });
  }

  try {
    const payload = {
      'receipt-data': receiptData,
      password: sharedSecret,
      'exclude-old-transactions': true,
    };

    let appleResp = null;
    let url = APPLE_PROD_URL;

    try {
      appleResp = await axios.post(url, payload, { timeout: 10000 });
    } catch (e) {
      logger.warn('Apple verifyReceipt production call failed, will inspect/retry if needed', e?.response?.data || e.message);
      appleResp = e.response; // may be undefined
    }

    let data = appleResp?.data;

    if (!data || data.status === 21007) {
      // Retry sandbox
      url = APPLE_SANDBOX_URL;
      const sandboxResp = await axios.post(url, payload, { timeout: 10000 });
      data = sandboxResp.data;
    }

    if (!data) {
      return res.status(502).json({ success: false, message: 'Empty response from Apple' });
    }

    if (data.status !== 0) {
      logger.warn(`Apple verifyReceipt returned non-zero status: ${data.status}`);
      return res.status(400).json({ success: false, message: `Apple status ${data.status}`, data });
    }

    // Extract receipt info
    const receipt = data.receipt || {};
    // iOS 7 style in_app array
    const inApp = Array.isArray(receipt.in_app) ? receipt.in_app : [];
    // iOS 6 style latest_receipt_info array (for auto-renewables Apple sends here)
    const latestInfo = Array.isArray(data.latest_receipt_info) ? data.latest_receipt_info : [];

    // Find latest matching product transaction
    const candidates = [...latestInfo, ...inApp].filter(i => i.product_id === productId);
    const latest = pickLatestByExpiry(candidates) || pickLatestByExpiry(latestInfo) || pickLatestByExpiry(inApp);

    if (!latest) {
      return res.status(404).json({ success: false, message: 'No matching transaction found in receipt' });
    }

    // Validate bundle id
    const receiptBundleId = receipt.bundle_id || latest.bid || latest.app_item_id || null;
    if (receiptBundleId && String(receiptBundleId) !== String(bundleIdExpected)) {
      logger.warn(`Bundle ID mismatch. Expected ${bundleIdExpected}, got ${receiptBundleId}`);
      // Not hard failing to allow flexible older receipts; uncomment to enforce
      // return res.status(400).json({ success: false, message: 'Bundle ID mismatch' });
    }

    const nowMs = Date.now();
    const { status } = normalizeAppleStatus(latest, nowMs);
    let expiresMs = Number(latest.expires_date_ms || 0) || nowMs;
    
    // SANDBOX TEST: Extend expiration to 2 days for testing
    // Apple Sandbox subscriptions expire in 5 minutes, but we extend them for testing
    if (environment === 'Sandbox') {
      const originalExpires = new Date(expiresMs);
      const extendedExpires = new Date(nowMs + (2 * 24 * 60 * 60 * 1000)); // 2 days from now
      logger.info(`[${requestId}] 🧪 SANDBOX MODE: Extending expiration from ${originalExpires.toISOString()} to ${extendedExpires.toISOString()}`);
      expiresMs = extendedExpires.getTime();
    }
    
    const expiresAtIso = new Date(expiresMs).toISOString();

    const originalTxId = latest.original_transaction_id || latest.original_transaction_identifier;
    const latestTxId = latest.transaction_id;
    const environment = data.environment || null;

    // Try map to a plan via subscription_plans.apple_product_id
    let planId = null;
    try {
      const planRes = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('apple_product_id', productId)
        .single();
      if (planRes?.data?.id) {
        planId = planRes.data.id;
      }
    } catch {}

    const dbRes = await upsertAppleSubscription({
      userId,
      productId,
      originalTxId,
      latestTxId,
      expiresAtIso,
      environment,
      planId,
    });

    if (dbRes.error) {
      logger.error('[APPLE-IAP] Failed to upsert subscription:', dbRes.error);
      return res.status(500).json({ success: false, message: 'Subscription update failed', error: dbRes.error.message, apple: data });
    }

    logger.info(`[${requestId}] ✅ Receipt verified successfully`);
    logger.info(`[${requestId}] Subscription ID: ${dbRes.data?.id}`);
    logger.info(`[${requestId}] Status: ${status}`);
    logger.info(`[${requestId}] Expires: ${expiresAtIso}`);
    logger.info(`[${requestId}] Environment: ${environment}`);
    logger.info(`[${requestId}] ========================================`);

    return res.json({
      success: true,
      message: 'Receipt verified',
      data: {
        subscription: dbRes.data,
        status,
        productId,
        expiresAt: expiresAtIso,
        environment,
      },
    });
  } catch (err) {
    logger.error(`[${requestId}] ❌❌❌ CRITICAL ERROR in Apple IAP verification`);
    logger.error(`[${requestId}] Error type: ${err.constructor.name}`);
    logger.error(`[${requestId}] Error message: ${err.message}`);
    logger.error(`[${requestId}] Error stack: ${err.stack}`);
    logger.error(`[${requestId}] User ID: ${userId}`);
    logger.error(`[${requestId}] Product ID: ${productId}`);
    if (err.response) {
      logger.error(`[${requestId}] Apple API response status: ${err.response.status}`);
      logger.error(`[${requestId}] Apple API response data: ${JSON.stringify(err.response.data, null, 2)}`);
    }
    logger.error(`[${requestId}] ========================================`);
    const code = err?.response?.status || 500;
    return res.status(code).json({ success: false, message: 'Apple verify failed', error: err?.response?.data || err.message });
  }
};
