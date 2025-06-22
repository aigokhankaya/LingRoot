// backend/utils/logger.js
const winston = require("winston");
const path = require("path");
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
  
  // Base64 benzeri karmaşık içerik olabilecek kısımları tespit et
  // Genellikle / ile başlayan ve çok uzun alfanumerik karakterlerden oluşan
  const complexContentRegex = /\/[A-Za-z0-9+/=]{100,}/g;
  
  // Bu tür içerikleri kısalt
  let sanitized = content.replace(complexContentRegex, '[BINARY_DATA]');
  
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

// Define transports (console and file)
const transports = [
  // Console transport with colorization
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      logFormat
    ),
    level: level, // Use environment-based level for console
  }),
  // File transport for errors
  new winston.transports.File({
    filename: path.join(__dirname, "../logs/error.log"),
    level: "error", // Only log errors to this file
    format: logFormat, // Use standard format without color
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  // File transport for all logs (optional, can be noisy)
  new winston.transports.File({
    filename: path.join(__dirname, "../logs/combined.log"),
    level: level, // Use environment-based level for combined file
    format: logFormat, // Use standard format without color
    maxsize: 5242880, // 5MB
    maxFiles: 5,
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

module.exports = logger;

