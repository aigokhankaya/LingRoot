/**
 * Client Error Controller
 * Receives error reports from web and mobile clients,
 * logs them via Winston (→ OTel → SigNoz) and records OTel exceptions.
 */

const logger = require('../utils/common/logger.js');
const { trace, SpanStatusCode } = require('@opentelemetry/api');

/**
 * POST /api/client-errors
 * Body: { message, stack?, component?, platform, severity, screenName?, context? }
 */
exports.reportError = (req, res) => {
  const {
    message,
    stack,
    component,
    platform,
    severity = 'error',
    screenName,
    context,
  } = req.body;

  if (!message || !platform) {
    return res.status(400).json({ success: false, error: 'message and platform are required' });
  }

  // Build structured log entry
  const logData = {
    component: component || 'unknown',
    platform,
    severity,
    screenName: screenName || undefined,
    context: context || undefined,
    stack: stack || undefined,
    userId: req.user?.id || 'anonymous',
  };

  // Log via Winston → OTel WinstonInstrumentation → SigNoz Logs
  const logMessage = `[CLIENT_ERROR] [${platform}] ${message}`;
  if (severity === 'warning') {
    logger.warn(logMessage, logData);
  } else {
    logger.error(logMessage, logData);
  }

  // Record as OTel exception → SigNoz Exceptions tab
  const tracer = trace.getTracer('lingroot-client-errors');
  const span = tracer.startSpan(`client-error.${platform}`);
  span.setAttribute('client.platform', platform);
  span.setAttribute('client.component', component || 'unknown');
  span.setAttribute('client.severity', severity);
  if (screenName) span.setAttribute('client.screen', screenName);
  if (req.user?.id) span.setAttribute('user.id', req.user.id);

  const error = new Error(message);
  if (stack) error.stack = stack;
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR, message });
  span.end();

  res.status(200).json({ success: true });
};
