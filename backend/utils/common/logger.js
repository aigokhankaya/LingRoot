// backend/utils/logger.js
const winston = require("winston");
require("dotenv").config();

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(logColors);

// Determine log level based on environment (default to 'info')
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

// Yardımcı fonksiyon: Uzun ve karmaşık metinleri kısaltır
const sanitizeLogContent = (content) => {
  if (typeof content !== 'string') {
    return content;
  }

  // Mask sensitive patterns: tokens, codes, credentials, secrets
  let sanitized = content
    .replace(/code=\d{4,}/g, 'code=******')
    .replace(/token=[A-Za-z0-9._-]{10,}/g, 'token=******')
    .replace(/access_token=[A-Za-z0-9._-]{10,}/g, 'access_token=******')
    .replace(/credential=[A-Za-z0-9._-]{10,}/g, 'credential=******')
    .replace(/Bearer [A-Za-z0-9._-]{10,}/g, 'Bearer ******')
    .replace(/password["']?\s*[:=]\s*["']?[^"'\s,}{]+/gi, 'password=******');

  // Base64 benzeri karmaşık içerik olabilecek kısımları tespit et
  const complexContentRegex = /\/[A-Za-z0-9+/=]{100,}/g;
  sanitized = sanitized.replace(complexContentRegex, '[BINARY_DATA]');

  // Çok uzun satırları kısalt (300 karakterden uzun)
  if (sanitized.length > 300) {
    sanitized = sanitized.substring(0, 297) + '...';
  }

  return sanitized;
};

// Create log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }), // Log stack trace for errors
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    // If stack exists (error), log stack; otherwise, log message
    let logMessage;

    if (stack) {
      logMessage = sanitizeLogContent(stack);
    } else if (typeof message === "object") {
      try {
        // Objeler için sadece önemli alanları al, dosya içeriklerini veya binary verileri dışla
        const filteredObj = { ...message };
        // mp3_url, file, audio gibi büyük binary içerik barındırabilecek alanları kaldır
        ['mp3_url', 'file', 'audio', 'binary', 'content', 'base64'].forEach(key => {
          if (filteredObj[key]) {
            filteredObj[key] = '[CONTENT_REMOVED]';
          }
        });
        logMessage = JSON.stringify(filteredObj, null, 2);
      } catch (e) {
        logMessage = '[COMPLEX_OBJECT]';
      }
    } else {
      logMessage = sanitizeLogContent(message);
    }

    return `${timestamp} [${(level && typeof level === 'string' ? level.toUpperCase() : 'INFO')}]: ${logMessage}`;
  })
);

// Define transports
// File transports removed — logs are forwarded to SigNoz via OTel WinstonInstrumentation.
// Console transport is kept for Render dashboard and local dev.
const transports = [
  // Console transport with colorization
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      logFormat
    ),
    level: level, // Use environment-based level for console
  }),
];

// Create the logger instance
const logger = winston.createLogger({
  level: level, // Set the overall maximum log level
  levels: logLevels,
  format: logFormat,
  transports: transports,
  exitOnError: false, // Do not exit on handled exceptions
});

// Log initialization message
logger.info(`Logger initialized with level: ${level}`);

// Helper: Structured LLM call logger for prompts/models/usage
/**
 * Logs a highlighted LLM call line so it is easy to spot in console logs.
 * Usage: logger.llmCall({ requestId, scope, step, model, promptName, level, provider, tokens, note })
 */
logger.llmCall = function llmCall(details = {}) {
  const {
    requestId,
    scope,
    step,
    model,
    promptName,
    level: cefrLevel,
    provider = 'openai',
    tokens,
    note,
  } = details;

  const tokenInfo = tokens
    ? ` | tokens in=${tokens.prompt_tokens || 0}, out=${tokens.completion_tokens || 0}, total=${tokens.total_tokens || 0}`
    : '';

  const core = [
    requestId ? `req=${requestId}` : null,
    scope ? `scope=${scope}` : null,
    step ? `step=${step}` : null,
    model ? `model=${model}` : null,
    promptName ? `prompt=${promptName}` : null,
    cefrLevel ? `level=${cefrLevel}` : null,
    provider ? `provider=${provider}` : null,
  ].filter(Boolean).join(' | ');

  const suffix = note ? ` | ${note}` : '';

  logger.info(`🧠 [LLM_CALL] ${core}${tokenInfo}${suffix}`);
};

module.exports = logger;

