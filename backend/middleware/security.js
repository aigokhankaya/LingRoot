// Security middleware
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

/**
 * Configure security middleware
 * @param {Express} app - Express application
 */
exports.configureSecurity = (app) => {
  // Set security HTTP headers
  app.use(helmet());
  
  // Enable CORS with specific origin
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'https://www.lingroot.com',
        'https://lingroot.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
      ];
      
      // Check exact match first
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } 
      // Allow all Vercel preview deployments
      else if (origin.match(/^https:\/\/ling-root-[a-z0-9]+-gokhans-projects-11087830\.vercel\.app$/)) {
        callback(null, true);
      } 
      else {
        console.log(`🚫 CORS blocked origin: ${origin}`);
        callback(new Error('CORS policy violation'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200
  };
  
  app.use(cors(corsOptions));
  
  // Rate limiting disabled for all environments per requirement
  // If needed later, re-enable with env-based config
  
  // Data sanitization against XSS
  app.use(xss());
  
  // Prevent parameter pollution
  app.use(hpp());
};

/**
 * Configure auth routes rate limiting
 */
exports.authLimiter = (req, res, next) => next();
