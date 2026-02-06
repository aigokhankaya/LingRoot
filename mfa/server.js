const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Logger setup (Simplified Winston)
const winston = require('winston');
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Create Global Logger for modules to use
global.logger = logger;

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'LingRoot MFA Alignment Service',
        timestamp: new Date().toISOString()
    });
});

// Import Routes
const mfaRoutes = require('./routes/mfaRoutes');
app.use('/api/mfa', mfaRoutes);

// Error Handler
app.use((err, req, res, next) => {
    logger.error('Unhandled Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    logger.info(`✅ MFA Alignment Service running on port ${PORT}`);
    logger.info(`   DICT_PATH: ${process.env.MFA_DICT_PATH}`);
    logger.info(`   ACOUSTIC_DIR: ${process.env.MFA_ACOUSTIC_DIR}`);
});
