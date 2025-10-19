const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();

// Import custom modules
const logger = require("./utils/logger"); // Winston logger
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { configureSecurity } = require("./middleware/security");
const requestIdMiddleware = require("./middleware/requestId");

// Import database connection
// const { sequelize } = require("./models"); // Removed Sequelize

// Import routes
const authRoutes = require("./routes/authRoutes");
const contentRoutes = require("./routes/contentRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const adminRoutes = require("./routes/adminRoutes");
const ttsRoutes = require("./routes/ttsRoutes");
const topicSuggestRoutes = require("./routes/topicSuggestRoutes");
const topicDetailRoutes = require("./routes/topicDetailRoutes");
const booksRouter = require("./routes/books");
const userRoutes = require("./routes/userRoutes"); // 👈 İlgi alanları burada bağlandı
const iapRoutes = require("./routes/iapRoutes"); // Apple IAP routes
const accountRoutes = require("./routes/accountRoutes"); // Account management

// Initialize Express app
const app = express();

app.use(express.json());

// Configure security middleware
configureSecurity(app);

// Request ID middleware
app.use(requestIdMiddleware);

// CORS middleware
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001", 
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "https://lingroot.com",
  "https://www.lingroot.com",
  "https://lingloops-backend.onrender.com",
  "https://api.lingroot.com",
  "https://lingroot.netlify.app",
  "https://lingroot.netlify.com",
  // Tüm alt domainler
  /^https:\/\/.*\.lingroot\.com$/
];

// CORS Yapılandırması - Geliştirme sırasında daha esnek
app.use(
  cors({
    origin: function (origin, callback) {
      // Geliştirme için daha esnek CORS, ancak üretimde dikkatli olun
      // Development ortamında tüm origins kabul edilir
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      
      // Production ortamında sadece belirli origins kabul edilir
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked for origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Request-ID', 'Range', 'Origin'],
    exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type', 'Content-Range', 'Accept-Ranges']
  })
);

// Stripe webhook special middleware
app.use("/subscription/webhook", express.raw({ type: "application/json" }));

// Other middlewares

app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info(`Uploads directory created at: ${uploadDir}`);
  } catch (err) {
    logger.error(`Failed to create uploads directory: ${err.message}`);
  }
}

// Mount routes

app.use("/api/auth", authRoutes);
app.use("/api/content", contentRoutes);
app.use(contentRoutes); // legacy fallback
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tts", ttsRoutes);
app.use("/api/topic-suggest", topicSuggestRoutes);
app.use("/api/topic-detail", topicDetailRoutes);
app.use("/api/books", booksRouter);
app.use("/api", userRoutes); // ✅ user-interests endpoint burada aktif
app.use('/auth', authRoutes);
app.use("/api/iap", iapRoutes); // Apple IAP verification
app.use("/api/account", accountRoutes); // Account management

// Health check endpoint (Render için)
app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to LingLoop API" });
});

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

// Port configuration
const PORT = parseInt(process.env.PORT || "5001", 10);
logger.info(`Attempting to start server on port ${PORT}`);
logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
logger.info(`Process environment PORT variable: ${process.env.PORT || "not set"}`);

// Start server function
const startServer = () => {
  const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info(`✅ Server is running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
    logger.info(`✅ Server successfully bound to port ${PORT}`);
  });

  server.on("error", (err) => {
    logger.error(`❌ Server failed to start: ${err.message}`);
    if (err.code === "EADDRINUSE") {
      logger.error(`❌ Port ${PORT} is already in use`);
    }
  });
};

// Database connection and server start (Removed Sequelize logic)
logger.info("Starting server...");
app.set("trust proxy", 1);
startServer();

// Global exception handlers
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", { promise, reason });
});

module.exports = app;
