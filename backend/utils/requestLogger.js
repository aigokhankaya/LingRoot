const fs = require('fs');
const path = require('path');

/**
 * Logs a step for a specific request to a unique file in logs/requests/.
 * For each requestId, only one file is created and all steps are appended to it.
 * @param {string} requestId - Unique request ID
 * @param {string} stepName - Step or phase name
 * @param {object} data - Arbitrary data to log (will be stringified)
 */
function logRequestStep(requestId, stepName, data) {
    const logsDir = path.join(__dirname, '../logs/requests');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    const now = new Date();
    const filename = `${requestId}.txt`;
    const filePath = path.join(logsDir, filename);
    const logLine = `[${now.toISOString()}] [${stepName}]
${JSON.stringify(data, null, 2)}

`;
    fs.appendFileSync(filePath, logLine, 'utf8');
}

module.exports = { logRequestStep }; 