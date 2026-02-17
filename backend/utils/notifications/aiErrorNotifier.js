/**
 * AI Error Notifier
 * Sends email notifications to admins when AI services encounter billing/critical errors
 * Supports: Google TTS, Gemini TTS, OpenAI Chat, OpenAI TTS
 */

const logger = require('../common/logger.js');
const { sendMail } = require('./mailer.js');

// Error type constants
const AI_ERROR_TYPES = {
  BILLING: 'billing',
  QUOTA_EXCEEDED: 'quota',
  RATE_LIMIT: 'rate_limit',
  API_KEY_INVALID: 'api_key',
  RESOURCE_EXHAUSTED: 'resource_exhausted',
  PERMISSION_DENIED: 'permission',
  INSUFFICIENT_CREDITS: 'credits',
  UNKNOWN: 'unknown'
};

// User-facing error types for push notifications
const USER_FACING_ERROR_TYPES = {
  AI_SERVICE_ERROR: 'ai_service_error',      // OpenAI/TTS service error
  PROCESSING_ERROR: 'processing_error',       // General processing error
  TEMPORARY_ERROR: 'temporary_error'          // Temporary error (retry suggested)
};

// User-facing error messages (Turkish)
const USER_ERROR_MESSAGES = {
  ai_service_error: 'İçerik oluşturulurken bir sorun oluştu. Ekibimiz konuyu inceliyor.',
  processing_error: 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.',
  temporary_error: 'Geçici bir sorun yaşanıyor. Birkaç dakika sonra tekrar deneyin.'
};

// Provider constants
const AI_PROVIDERS = {
  GOOGLE_TTS: 'google_tts',
  GEMINI_TTS: 'gemini_tts',
  OPENAI_CHAT: 'openai_chat',
  OPENAI_TTS: 'openai_tts'
};

// In-memory cooldown cache: Map<"provider:errorType", { lastSent: Date, count: number }>
const notificationCooldownCache = new Map();

// Cooldown durations (milliseconds)
const COOLDOWN_STANDARD = 15 * 60 * 1000; // 15 minutes
const COOLDOWN_CRITICAL = 30 * 60 * 1000; // 30 minutes for billing/API key errors

/**
 * Check if notifications are enabled via environment variable
 * @returns {boolean}
 */
function isNotificationEnabled() {
  const envValue = process.env.AI_ERROR_NOTIFICATIONS_ENABLED;
  // Default to true if not set
  if (envValue === undefined || envValue === null || envValue === '') {
    return true;
  }
  return envValue === 'true' || envValue === '1';
}

/**
 * Detect error type from error message and HTTP status
 * @param {Error|string} error - Error object or message
 * @param {number} httpStatus - HTTP status code
 * @returns {string} Error type from AI_ERROR_TYPES
 */
function detectErrorType(error, httpStatus) {
  const errorMsg = (typeof error === 'string' ? error : error?.message || '').toLowerCase();
  const errorCode = error?.code?.toLowerCase?.() || '';

  // HTTP status based detection
  if (httpStatus === 402) {
    return AI_ERROR_TYPES.BILLING;
  }
  if (httpStatus === 429) {
    return AI_ERROR_TYPES.RATE_LIMIT;
  }
  if (httpStatus === 401) {
    return AI_ERROR_TYPES.API_KEY_INVALID;
  }
  if (httpStatus === 403) {
    return AI_ERROR_TYPES.PERMISSION_DENIED;
  }

  // Message-based detection
  if (errorMsg.includes('billing') || errorMsg.includes('payment') || errorMsg.includes('invoice')) {
    return AI_ERROR_TYPES.BILLING;
  }
  if (errorMsg.includes('quota') || errorMsg.includes('exceeded') || errorMsg.includes('resource_exhausted') || errorCode.includes('resource_exhausted')) {
    return AI_ERROR_TYPES.QUOTA_EXCEEDED;
  }
  if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests') || errorMsg.includes('rate_limit')) {
    return AI_ERROR_TYPES.RATE_LIMIT;
  }
  if (errorMsg.includes('api key') || errorMsg.includes('invalid key') || errorMsg.includes('expired') || errorMsg.includes('api_key')) {
    return AI_ERROR_TYPES.API_KEY_INVALID;
  }
  if (errorMsg.includes('permission') || errorMsg.includes('denied') || errorMsg.includes('forbidden')) {
    return AI_ERROR_TYPES.PERMISSION_DENIED;
  }
  if (errorMsg.includes('insufficient') || errorMsg.includes('credits') || errorMsg.includes('balance')) {
    return AI_ERROR_TYPES.INSUFFICIENT_CREDITS;
  }

  return AI_ERROR_TYPES.UNKNOWN;
}

/**
 * Check if notification should be sent (spam control)
 * @param {string} provider - Provider from AI_PROVIDERS
 * @param {string} errorType - Error type from AI_ERROR_TYPES
 * @returns {{ shouldSend: boolean, lastSentAgo: number|null, occurrenceCount: number }}
 */
function shouldSendNotification(provider, errorType) {
  const cacheKey = `${provider}:${errorType}`;
  const now = Date.now();

  // Critical errors get longer cooldown
  const isCritical = [
    AI_ERROR_TYPES.BILLING,
    AI_ERROR_TYPES.API_KEY_INVALID,
    AI_ERROR_TYPES.INSUFFICIENT_CREDITS
  ].includes(errorType);
  const cooldownMs = isCritical ? COOLDOWN_CRITICAL : COOLDOWN_STANDARD;

  const cached = notificationCooldownCache.get(cacheKey);
  if (!cached) {
    // First occurrence
    notificationCooldownCache.set(cacheKey, { lastSent: now, count: 1 });
    return { shouldSend: true, lastSentAgo: null, occurrenceCount: 1 };
  }

  const elapsed = now - cached.lastSent;
  cached.count += 1;

  if (elapsed >= cooldownMs) {
    // Cooldown expired, allow sending
    const count = cached.count;
    cached.lastSent = now;
    cached.count = 1;
    notificationCooldownCache.set(cacheKey, cached);
    return { shouldSend: true, lastSentAgo: elapsed, occurrenceCount: count };
  }

  // Still in cooldown
  return { shouldSend: false, lastSentAgo: elapsed, occurrenceCount: cached.count };
}

/**
 * Get recommended actions based on error type
 * @param {string} errorType - Error type from AI_ERROR_TYPES
 * @param {string} provider - Provider from AI_PROVIDERS
 * @returns {string[]} List of recommended actions
 */
function getRecommendedActions(errorType, provider) {
  const actions = [];

  switch (errorType) {
    case AI_ERROR_TYPES.BILLING:
      actions.push('Check billing status and payment method in provider console');
      actions.push('Verify credit card is valid and not expired');
      actions.push('Review recent invoices for payment failures');
      break;
    case AI_ERROR_TYPES.QUOTA_EXCEEDED:
      actions.push('Check usage limits in provider console');
      actions.push('Consider upgrading to a higher tier plan');
      actions.push('Review usage patterns for unexpected spikes');
      break;
    case AI_ERROR_TYPES.RATE_LIMIT:
      actions.push('Implement request throttling if not already');
      actions.push('Consider increasing rate limit tier');
      actions.push('Review concurrent request patterns');
      break;
    case AI_ERROR_TYPES.API_KEY_INVALID:
      actions.push('Verify API key in .env file');
      actions.push('Check if API key was rotated or revoked');
      actions.push('Generate a new API key if needed');
      break;
    case AI_ERROR_TYPES.PERMISSION_DENIED:
      actions.push('Check service account permissions');
      actions.push('Verify API is enabled in provider console');
      actions.push('Review IAM roles and access policies');
      break;
    case AI_ERROR_TYPES.INSUFFICIENT_CREDITS:
      actions.push('Add credits to account');
      actions.push('Set up automatic billing or top-up');
      break;
    default:
      actions.push('Review error logs for more details');
      actions.push('Check provider status page for outages');
  }

  // Provider-specific actions
  if (provider === AI_PROVIDERS.GOOGLE_TTS || provider === AI_PROVIDERS.GEMINI_TTS) {
    actions.push('Console: https://console.cloud.google.com/');
  } else if (provider === AI_PROVIDERS.OPENAI_CHAT || provider === AI_PROVIDERS.OPENAI_TTS) {
    actions.push('Console: https://platform.openai.com/');
  }

  return actions;
}

/**
 * Get human-readable provider name
 * @param {string} provider - Provider from AI_PROVIDERS
 * @returns {string}
 */
function getProviderDisplayName(provider) {
  const names = {
    [AI_PROVIDERS.GOOGLE_TTS]: 'Google TTS',
    [AI_PROVIDERS.GEMINI_TTS]: 'Gemini TTS',
    [AI_PROVIDERS.OPENAI_CHAT]: 'OpenAI Chat',
    [AI_PROVIDERS.OPENAI_TTS]: 'OpenAI TTS'
  };
  return names[provider] || provider;
}

/**
 * Get human-readable error type name
 * @param {string} errorType - Error type from AI_ERROR_TYPES
 * @returns {string}
 */
function getErrorTypeDisplayName(errorType) {
  const names = {
    [AI_ERROR_TYPES.BILLING]: 'Billing Error',
    [AI_ERROR_TYPES.QUOTA_EXCEEDED]: 'Quota Exceeded',
    [AI_ERROR_TYPES.RATE_LIMIT]: 'Rate Limit',
    [AI_ERROR_TYPES.API_KEY_INVALID]: 'Invalid API Key',
    [AI_ERROR_TYPES.RESOURCE_EXHAUSTED]: 'Resource Exhausted',
    [AI_ERROR_TYPES.PERMISSION_DENIED]: 'Permission Denied',
    [AI_ERROR_TYPES.INSUFFICIENT_CREDITS]: 'Insufficient Credits',
    [AI_ERROR_TYPES.UNKNOWN]: 'Unknown Error'
  };
  return names[errorType] || errorType;
}

/**
 * Send AI error notification to admin(s)
 * @param {Object} errorInfo - Error information
 * @param {string} errorInfo.provider - Provider from AI_PROVIDERS
 * @param {string} errorInfo.method - Method/endpoint that failed
 * @param {Error|string} errorInfo.error - Error object or message
 * @param {number} [errorInfo.httpStatus] - HTTP status code
 * @param {string} [errorInfo.userId] - User ID if available
 * @param {Object} [errorInfo.context] - Additional context
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
async function notifyAIError(errorInfo) {
  const {
    provider,
    method,
    error,
    httpStatus,
    userId,
    context = {}
  } = errorInfo;

  // Check if notifications are enabled
  if (!isNotificationEnabled()) {
    logger.debug('[AI_ERROR_NOTIFIER] Notifications disabled via AI_ERROR_NOTIFICATIONS_ENABLED');
    return { sent: false, reason: 'disabled' };
  }

  // Detect error type
  const errorType = detectErrorType(error, httpStatus);
  const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';
  const errorStack = error?.stack || null;

  // Check cooldown
  const { shouldSend, lastSentAgo, occurrenceCount } = shouldSendNotification(provider, errorType);

  if (!shouldSend) {
    const cooldownMins = Math.round((lastSentAgo || 0) / 60000);
    logger.info(`[AI_ERROR_NOTIFIER] Skipping notification (cooldown): ${provider}:${errorType} - ${occurrenceCount} occurrences in ${cooldownMins} min`);
    return { sent: false, reason: 'cooldown', occurrenceCount };
  }

  // Get admin email(s)
  const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS || process.env.ADMIN_EMAIL;
  if (!adminEmails) {
    logger.warn('[AI_ERROR_NOTIFIER] No admin email configured (ADMIN_NOTIFICATION_EMAILS or ADMIN_EMAIL)');
    return { sent: false, reason: 'no_admin_email' };
  }

  // Fetch user details if userId is provided
  let userInfo = null;
  if (userId) {
    try {
      const { supabase } = require('../storage/supabaseClient.js');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name, cefr_level, created_at')
        .eq('id', userId)
        .single();

      if (!userError && userData) {
        userInfo = userData;
        logger.debug(`[AI_ERROR_NOTIFIER] Fetched user info for ${userId}: ${userData.email}`);
      } else {
        logger.warn(`[AI_ERROR_NOTIFIER] Could not fetch user info for ${userId}: ${userError?.message}`);
      }
    } catch (e) {
      logger.warn(`[AI_ERROR_NOTIFIER] Error fetching user info: ${e.message}`);
    }
  }

  // Build email content
  const providerName = getProviderDisplayName(provider);
  const errorTypeName = getErrorTypeDisplayName(errorType);
  const recommendedActions = getRecommendedActions(errorType, provider);
  const timestamp = new Date().toISOString();
  const environment = process.env.NODE_ENV || 'development';

  const subject = `[LingRoot ${environment.toUpperCase()}] AI Error: ${providerName} - ${errorTypeName}`;

  // Build user info section for email
  const userSection = userInfo
    ? `USER INFORMATION:
User ID: ${userInfo.id}
Email: ${userInfo.email || 'N/A'}
Name: ${userInfo.full_name || 'N/A'}
CEFR Level: ${userInfo.cefr_level || 'N/A'}
Account Created: ${userInfo.created_at ? new Date(userInfo.created_at).toLocaleDateString('tr-TR') : 'N/A'}`
    : userId
      ? `User ID: ${userId}`
      : '';

  const textContent = `
AI SERVICE ERROR NOTIFICATION
============================

Provider: ${providerName}
Error Type: ${errorTypeName}
Method/Endpoint: ${method || 'N/A'}
HTTP Status: ${httpStatus || 'N/A'}
Timestamp: ${timestamp}
Environment: ${environment}

ERROR MESSAGE:
${errorMessage}

${userSection}

${Object.keys(context).length > 0 ? `CONTEXT:\n${JSON.stringify(context, null, 2)}` : ''}

${occurrenceCount > 1 ? `OCCURRENCE COUNT: ${occurrenceCount} times since last notification` : ''}

RECOMMENDED ACTIONS:
${recommendedActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

${errorStack ? `\nSTACK TRACE:\n${errorStack}` : ''}

---
This is an automated notification from LingRoot AI Error Notifier.
To disable: Set AI_ERROR_NOTIFICATIONS_ENABLED=false in .env
  `.trim();

  // Build user info HTML section
  const userHtmlSection = userInfo
    ? `
    <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:15px; border-radius:6px; margin:15px 0;">
      <strong>Kullanıcı Bilgileri:</strong>
      <table style="width:100%; margin-top:10px; border-collapse:collapse;">
        <tr><td class="label" style="padding:4px 8px;">User ID:</td><td class="value" style="padding:4px 8px;"><code>${userInfo.id}</code></td></tr>
        <tr><td class="label" style="padding:4px 8px;">Email:</td><td class="value" style="padding:4px 8px;"><strong>${userInfo.email || 'N/A'}</strong></td></tr>
        <tr><td class="label" style="padding:4px 8px;">İsim:</td><td class="value" style="padding:4px 8px;">${userInfo.full_name || 'N/A'}</td></tr>
        <tr><td class="label" style="padding:4px 8px;">CEFR Seviyesi:</td><td class="value" style="padding:4px 8px;">${userInfo.cefr_level || 'N/A'}</td></tr>
        <tr><td class="label" style="padding:4px 8px;">Kayıt Tarihi:</td><td class="value" style="padding:4px 8px;">${userInfo.created_at ? new Date(userInfo.created_at).toLocaleDateString('tr-TR') : 'N/A'}</td></tr>
      </table>
    </div>
    `
    : userId
      ? `<tr><td class="label">User ID:</td><td class="value">${userId}</td></tr>`
      : '';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 15px; border-radius: 8px 8px 0 0; }
    .content { background: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; }
    .label { font-weight: bold; color: #374151; }
    .value { color: #1f2937; }
    .error-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .actions { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .action-item { margin: 8px 0; }
    .meta { font-size: 12px; color: #6b7280; margin-top: 20px; }
    code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin:0;">AI Service Error - ${providerName}</h2>
    <p style="margin:5px 0 0 0; opacity:0.9;">${errorTypeName}</p>
  </div>
  <div class="content">
    <table style="width:100%; border-collapse:collapse;">
      <tr><td class="label">Provider:</td><td class="value">${providerName}</td></tr>
      <tr><td class="label">Error Type:</td><td class="value"><code>${errorType}</code> (${errorTypeName})</td></tr>
      <tr><td class="label">Method:</td><td class="value">${method || 'N/A'}</td></tr>
      <tr><td class="label">HTTP Status:</td><td class="value">${httpStatus || 'N/A'}</td></tr>
      <tr><td class="label">Timestamp:</td><td class="value">${timestamp}</td></tr>
      <tr><td class="label">Environment:</td><td class="value"><code>${environment}</code></td></tr>
    </table>

    ${userInfo ? userHtmlSection : (userId ? `<p><strong>User ID:</strong> ${userId}</p>` : '')}

    <div class="error-box">
      <strong>Error Message:</strong><br>
      <code>${errorMessage}</code>
    </div>

    ${occurrenceCount > 1 ? `<p><strong>Occurrence Count:</strong> ${occurrenceCount} times since last notification</p>` : ''}

    ${Object.keys(context).length > 0 ? `
    <details>
      <summary><strong>Additional Context</strong></summary>
      <pre style="background:#e5e7eb; padding:10px; border-radius:4px; overflow-x:auto;">${JSON.stringify(context, null, 2)}</pre>
    </details>
    ` : ''}

    <div class="actions">
      <strong>Recommended Actions:</strong>
      ${recommendedActions.map(a => `<div class="action-item">• ${a}</div>`).join('')}
    </div>

    ${errorStack ? `
    <details>
      <summary><strong>Stack Trace</strong></summary>
      <pre style="background:#e5e7eb; padding:10px; border-radius:4px; overflow-x:auto; font-size:11px;">${errorStack}</pre>
    </details>
    ` : ''}

    <div class="meta">
      This is an automated notification from LingRoot AI Error Notifier.<br>
      To disable: Set <code>AI_ERROR_NOTIFICATIONS_ENABLED=false</code> in .env
    </div>
  </div>
</body>
</html>
  `.trim();

  // Send to each admin email
  const emails = adminEmails.split(',').map(e => e.trim()).filter(Boolean);
  let sentCount = 0;

  for (const email of emails) {
    try {
      await sendMail({
        to: email,
        subject,
        text: textContent,
        html: htmlContent
      });
      sentCount++;
      logger.info(`[AI_ERROR_NOTIFIER] Notification sent to ${email}: ${provider}:${errorType}`);
    } catch (mailError) {
      logger.error(`[AI_ERROR_NOTIFIER] Failed to send to ${email}: ${mailError.message}`);
    }
  }

  return { sent: sentCount > 0, sentCount, totalRecipients: emails.length };
}

// Log initialization status
if (isNotificationEnabled()) {
  logger.info('[AI_ERROR_NOTIFIER] AI error notifications are ENABLED');
} else {
  logger.info('[AI_ERROR_NOTIFIER] AI error notifications are DISABLED');
}

/**
 * Check if error type is critical (should stop processing)
 * @param {string} errorType - Error type from AI_ERROR_TYPES
 * @returns {boolean}
 */
function isCriticalError(errorType) {
  const criticalTypes = [
    AI_ERROR_TYPES.BILLING,
    AI_ERROR_TYPES.API_KEY_INVALID,
    AI_ERROR_TYPES.INSUFFICIENT_CREDITS,
    AI_ERROR_TYPES.PERMISSION_DENIED,
    AI_ERROR_TYPES.QUOTA_EXCEEDED
  ];
  return criticalTypes.includes(errorType);
}

/**
 * Create a user-facing error object that can be thrown
 * @param {string} userErrorType - Error type from USER_FACING_ERROR_TYPES
 * @param {string} originalMessage - Original error message (for logging)
 * @param {boolean} retryable - Whether the error is retryable
 * @returns {Error}
 */
function createUserFacingError(userErrorType, originalMessage, retryable = false) {
  const error = new Error('AI_SERVICE_UNAVAILABLE');
  error.userFacing = true;
  error.userErrorType = userErrorType;
  error.userMessage = USER_ERROR_MESSAGES[userErrorType] || USER_ERROR_MESSAGES.processing_error;
  error.originalMessage = originalMessage;
  error.retryable = retryable;
  return error;
}

/**
 * Send push notification to user about AI error
 * @param {string} userId - User ID
 * @param {string} errorType - Error type from USER_FACING_ERROR_TYPES
 * @param {Object} context - Additional context (input_type, topic, jobId, etc.)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function notifyUserOfError(userId, errorType, context = {}) {
  if (!userId) {
    logger.warn('[AI_ERROR_NOTIFIER] Cannot notify user: userId is missing');
    return { success: false, error: 'userId is missing' };
  }

  try {
    const { sendPushNotification } = require('./pushNotification.js');

    const message = USER_ERROR_MESSAGES[errorType] || USER_ERROR_MESSAGES.processing_error;

    await sendPushNotification(userId, {
      title: 'İçerik Oluşturulamadı',
      body: message,
      type: 'content_failed',
      data: {
        errorType,
        ...context
      }
    });

    logger.info(`[AI_ERROR_NOTIFIER] User notification sent to ${userId}: ${errorType}`);
    return { success: true };
  } catch (error) {
    logger.error(`[AI_ERROR_NOTIFIER] Failed to send user notification: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  notifyAIError,
  notifyUserOfError,
  detectErrorType,
  shouldSendNotification,
  isNotificationEnabled,
  isCriticalError,
  createUserFacingError,
  AI_ERROR_TYPES,
  AI_PROVIDERS,
  USER_FACING_ERROR_TYPES,
  USER_ERROR_MESSAGES
};
