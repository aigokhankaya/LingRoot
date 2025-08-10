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
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
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
  
  // Rate limiting (disabled in production)
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again after 15 minutes'
    });
    app.use('/api', limiter);
  }
  
  // Data sanitization against XSS
  app.use(xss());
  
  // Prevent parameter pollution
  app.use(hpp());
};

/**
 * Configure auth routes rate limiting
 */
exports.authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: process.env.NODE_ENV === 'production' ? 0 : 10, // 0 = disabled in production
  message: 'Too many authentication attempts, please try again after an hour'
});
