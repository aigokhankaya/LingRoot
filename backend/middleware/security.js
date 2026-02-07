// Security middleware
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');
const cors = require('cors');
const logger = require('../utils/common/logger.js');

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
        'http://127.0.0.1:3000',
        'https://api.booklevel.store',  // Cloudflare Tunnel for MFA
        'http://localhost:19006'  // Expo development
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
        logger.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error('CORS policy violation'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200
  };

  app.use(cors(corsOptions));

  // Prevent parameter pollution
  app.use(hpp());
};

// ============================================
// RATE LIMITERS
// Brute-force, DoS ve API abuse koruması
// ============================================

// Load test mode - bypass rate limiters
const isLoadTest = process.env.LOAD_TEST_MODE === 'true';

/**
 * Auth endpoint'leri için sıkı rate limit
 * Login/Register brute-force saldırılarını önler
 */
exports.authLimiter = isLoadTest
  ? (req, res, next) => next()
  : rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 5, // IP başına 5 deneme
    message: {
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
  });

/**
 * Register endpoint için daha sıkı limit
 * Spam hesap oluşturmayı önler
 */
exports.registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 3, // IP başına 3 kayıt denemesi
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Çok fazla kayıt denemesi. 1 saat sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Password reset için limit
 * Email spam'i önler
 */
exports.passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 3, // IP başına 3 istek
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Çok fazla şifre sıfırlama isteği. 1 saat sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Refresh token endpoint için yumusak rate limit
 * Token flood saldirisini onler, session continuity'i bozmaz
 */
exports.refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 30, // 15 dk'da max 30 refresh istegi
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many refresh requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * TTS endpoint için maliyet koruması
 * OpenAI/Google TTS API maliyetlerini kontrol altında tutar
 */
exports.ttsLimiter = isLoadTest
  ? (req, res, next) => next()
  : rateLimit({
    windowMs: 60 * 60 * 1000, // 1 saat
    max: 30, // IP başına 30 TTS isteği (authenticated users will have plan-based limits too)
    message: {
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Saatlik TTS limitinizi aştınız. 1 saat sonra tekrar deneyin veya paket yükseltin.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

/**
 * Chat/AI endpoint için limit
 * OpenAI API maliyetlerini kontrol altında tutar
 */
exports.chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 60, // Dakikada 60 mesaj (saniyede 1)
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Çok hızlı mesaj gönderiyorsunuz. Biraz bekleyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Chat günlük limit
 * Aşırı kullanımı önler
 */
exports.chatDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 saat
  max: 500, // Günde 500 mesaj
  message: {
    success: false,
    code: 'DAILY_LIMIT_EXCEEDED',
    message: 'Günlük mesaj limitinizi aştınız. Yarın tekrar deneyin veya paket yükseltin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Genel API limiti
 * Tüm endpoint'ler için fallback koruma
 */
exports.generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 300, // Dakikada 300 istek
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Çok fazla istek. Lütfen biraz bekleyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip if user is authenticated (they have their own limits)
  skip: (req) => !!req.user,
});

/**
 * Vocabulary lookup için limit
 * Okuma sırasında hızlı kelime bakışı için cömert limit
 */
exports.vocabularyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 120, // Dakikada 120 kelime bakışı
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Çok fazla kelime araması. Biraz bekleyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Content/History endpoint'leri için limit
 * Normal navigasyon için yeterli
 */
exports.contentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 60, // Dakikada 60 istek
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Çok fazla istek. Lütfen biraz bekleyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Podcast oluşturma için limit
 * Uzun işlem + yüksek maliyet
 */
exports.podcastLimiter = isLoadTest
  ? (req, res, next) => next()
  : rateLimit({
    windowMs: 60 * 60 * 1000, // 1 saat
    max: 10, // Saatte 10 podcast
    message: {
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Saatlik podcast limitinizi aştınız. 1 saat sonra tekrar deneyin.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

// ============================================
// GAMIFICATION RATE LIMITERS
// XP farming ve abuse koruması
// ============================================

/**
 * XP endpoint için sıkı limit
 * XP farming/manipulation önleme
 */
exports.xpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 10, // Dakikada max 10 XP isteği
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Çok fazla XP isteği. Lütfen biraz bekleyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Quest completion için limit
 * Quest farming önleme
 */
exports.questLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 20, // Dakikada max 20 quest işlemi
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Çok fazla görev isteği. Lütfen biraz bekleyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Daily quest claim için limit
 * Claim spam önleme
 */
exports.dailyQuestClaimLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 10, // Dakikada max 10 claim
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Çok fazla ödül alma isteği. Lütfen biraz bekleyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Streak endpoint için limit
 * Streak manipulation önleme
 */
exports.streakLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 10, // Saatte max 10 streak işlemi
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Çok fazla streak isteği. 1 saat sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Onboarding reset için sıkı limit
 * Reset abuse önleme
 */
exports.onboardingResetLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 saat
  max: 3, // Günde max 3 reset
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Günlük sıfırlama limitinizi aştınız. Yarın tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Gamification genel limiti
 * Tüm gamification endpoint'leri için
 */
exports.gamificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 60, // Dakikada 60 istek
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Çok fazla istek. Lütfen biraz bekleyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
