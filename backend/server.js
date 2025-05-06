const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();

// Import custom modules
const logger = require("./utils/logger"); // Winston logger
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { configureSecurity } = require("./middleware/security");

// Import database connection
// const { sequelize } = require("./models"); // Removed Sequelize

// Import routes
const authRoutes = require("./routes/authRoutes");
const contentRoutes = require("./routes/contentRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const adminRoutes = require("./routes/adminRoutes");
const ttsRoutes = require("./routes/ttsRoutes");
const topicSuggestRoutes = require("./routes/topicSuggestRoutes");

// Initialize Express app
const app = express();

// Configure security middleware
configureSecurity(app);

// CORS middleware
app.use(cors({
  origin: ["https://www.lingroot.com", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  credentials: true
}));

// Stripe webhook special middleware
app.use("/subscription/webhook", express.raw({ type: "application/json" }));

// Other middlewares
app.use(express.json());
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
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tts", ttsRoutes);
app.use("/api/topic-suggest", topicSuggestRoutes);

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
app.set('trust proxy', 1);
startServer();

// Global exception handlers
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  // Consider shutting down gracefully after an uncaught exception
  // process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", { promise, reason });
});

module.exports = app;

