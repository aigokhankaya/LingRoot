/**
 * LingRoot Backend Server
 * Main entry point for the Express API server
 */

// dotenv must be loaded before instrumentation reads env vars
require('dotenv').config();

// OTel instrumentation must be loaded before everything else
require('./instrumentation');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const path = require('path');
const { createServer } = require('http');

// Initialize logger first
const logger = require('./utils/common/logger.js');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler.js');
const requestIdMiddleware = require('./middleware/requestId.js');

// Import routes
const authRoutes = require('./routes/authRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
const adminRoutes = require('./routes/adminRoutes.js');
const ttsRoutes = require('./routes/ttsRoutes.js');
const contentRoutes = require('./routes/contentRoutes.js');
const vocabularyRoutes = require('./routes/vocabularyRoutes.js');
const chatRoutes = require('./routes/chat.js');
const aiChatRoutes = require('./routes/aiChat.js');
const supportChatRoutes = require('./routes/supportChat.js');
const subscriptionRoutes = require('./routes/subscriptionRoutes.js');
const stripeRoutes = require('./routes/stripeRoutes.js');
const iyzicoRoutes = require('./routes/iyzicoRoutes.js');
const iapRoutes = require('./routes/iapRoutes.js');
const booksRoutes = require('./routes/books.js');
const documentRoutes = require('./routes/documentRoutes.js');
const podcastRoutes = require('./routes/podcastRoutes.js');
const youtubeRoutes = require('./routes/youtubeRoutes.js');
const youtubeRoutesV2 = require('./routes/youtubeRoutesV2.js');
const topicHierarchyRoutes = require('./routes/topicHierarchy.js');
const topicDetailRoutes = require('./routes/topicDetailRoutes.js');
const topicPipelineRoutes = require('./routes/topicPipelineRoutes.js');
const topicMasteryRoutes = require('./routes/topicMasteryRoutes.js');
const topicSuggestRoutes = require('./routes/topicSuggestRoutes.js');
const gamificationRoutes = require('./routes/gamificationRoutes.js');
const quizRoutes = require('./routes/quizRoutes.js');
const patternRoutes = require('./routes/patternRoutes.js');
const translationRoutes = require('./routes/translationRoutes.js');
const narrationRoutes = require('./routes/narrationRoutes.js');
const assessmentRoutes = require('./routes/assessmentRoutes.js');
const hobbySuggestionsRoutes = require('./routes/hobbySuggestionsRoutes.js');
const libraryRoutes = require('./routes/libraryRoutes.js');
const favoritesRoutes = require('./routes/favoritesRoutes.js');
const contentRatingRoutes = require('./routes/contentRatingRoutes.js');
const notificationRoutes = require('./routes/notificationRoutes.js');
const configRoutes = require('./routes/configRoutes.js');
const parameterRoutes = require('./routes/parameterRoutes.js');
const healthRoutes = require('./routes/healthRoutes.js');
const statsRoutes = require('./routes/statsRoutes.js');
const metricsRoutes = require('./routes/metricsRoutes.js');
const debugRoutes = require('./routes/debugRoutes.js');
const srsRoutes = require('./routes/srsRoutes.js');
const mfaRoutes = require('./routes/mfaRoutes.js');
const accountRoutes = require('./routes/accountRoutes.js');
const externalServicesRoutes = require('./routes/externalServicesRoutes.js');
const recommendationsRoutes = require('./routes/recommendationsRoutes.js');
const apiCostsRoutes = require('./routes/apiCostsRoutes.js');
const appleNotificationsRoutes = require('./routes/appleNotificationsRoutes.js');
const googlePlayNotificationsRoutes = require('./routes/googlePlayNotificationsRoutes.js');
const userSectorRoutes = require('./routes/userSectorRoutes.js');
const perfLogsRoutes = require('./routes/perfLogsRoutes.js');
const clientErrorRoutes = require('./routes/clientErrorRoutes.js');

// Create Express app
const app = express();
const httpServer = createServer(app);

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));
app.use(hpp());

// CORS configuration
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5001',
    'https://lingroot.com',
    'https://www.lingroot.com',
    'https://lingloops.com',
    'https://www.lingloops.com',
    'https://lingloops-frontend.onrender.com',
    'https://lingloops-backend.onrender.com',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(null, true); // Allow anyway for now, log for debugging
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Request-ID']
}));

// Request ID middleware
app.use(requestIdMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (req.path !== '/healthz' && req.path !== '/api/health') {
            logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
        }
    });
    next();
});

// Health check endpoints (before auth)
app.get('/healthz', (req, res) => res.status(200).send('OK'));
app.get('/', (req, res) => res.status(200).send('LingRoot Backend Service'));
app.use('/api/health', healthRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', userRoutes); // Also mount at /api for /api/user-settings etc.
app.use('/api/admin', adminRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/support-chat', supportChatRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/iyzico', iyzicoRoutes);
app.use('/api/iap', iapRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/podcasts', podcastRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/youtube-v2', youtubeRoutesV2);
app.use('/api/topic-hierarchy', topicHierarchyRoutes);
app.use('/api/topic-details', topicDetailRoutes);
app.use('/api/topic-pipeline', topicPipelineRoutes);
app.use('/api/topic-mastery', topicMasteryRoutes);
app.use('/api/topic-suggest', topicSuggestRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/patterns', patternRoutes);
app.use('/api/translate', translationRoutes);
app.use('/api/narration', narrationRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/hobby-suggestions', hobbySuggestionsRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/content-rating', contentRatingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/config', configRoutes);
app.use('/api/parameters', parameterRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/srs', srsRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/external-services', externalServicesRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/admin', apiCostsRoutes);
app.use('/api/apple-notifications', appleNotificationsRoutes);
app.use('/api/google-play-notifications', googlePlayNotificationsRoutes);
app.use('/api/user-sectors', userSectorRoutes);
app.use('/api/perf-logs', perfLogsRoutes);
app.use('/api/client-errors', clientErrorRoutes);
app.use('/api/admin/jobs', require('./routes/jobRoutes.js'));

// Try to load optional routes (may not exist)
try {
    const sectorRoutes = require('./routes/sectorRoutes.js');
    app.use('/api/sectors', sectorRoutes);
} catch (e) {
    logger.debug('sectorRoutes not loaded (may be empty or missing)');
}

try {
    const moduleRoutes = require('./routes/moduleRoutes.js');
    app.use('/api/modules', moduleRoutes);
} catch (e) {
    logger.debug('moduleRoutes not loaded (may be empty or missing)');
}

// Error handling
app.use(notFound);
app.use(errorHandler);

// Server timeouts (TTS + MFA pipeline can take several minutes)
httpServer.requestTimeout = 10 * 60 * 1000;  // 10 min
httpServer.headersTimeout = 65 * 1000;        // 65s (must be > keepAliveTimeout)
httpServer.keepAliveTimeout = 60 * 1000;      // 60s

// Start server
const PORT = process.env.PORT || 5001;

httpServer.listen(PORT, async () => {
    logger.info(`🚀 LingRoot Backend server running on port ${PORT}`);
    logger.info(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info('📋 [TTS] Async TTS processing uses in-memory jobQueue (BullMQ worker disabled)');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    httpServer.close(() => {
        logger.info('Server closed.');
        process.exit(0);
    });
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

module.exports = { app, httpServer };
