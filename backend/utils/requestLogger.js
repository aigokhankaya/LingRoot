const fs = require('fs');
const path = require('path');

// In-memory cache to track open boxes per requestId and step
const openBoxes = {};

/**
 * Logs a step for a specific request to a unique file in logs/requests/.
 * For each requestId, only one file is created and all steps are appended to it.
 * For main steps (e.g., extractText, translate, adaptCEFR), a box is opened at ':start' and closed at ':end'.
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
    const mainStep = stepName.split(':')[0];
    const subStep = stepName.split(':')[1] || '';
    let logLine = '';

    // Open box at :start
    if (subStep === 'start') {
        logLine += `-------------------- ${mainStep} --------------------\n`;
        if (!openBoxes[requestId]) openBoxes[requestId] = {};
        openBoxes[requestId][mainStep] = true;
    }

    logLine += `[${now.toISOString()}] [${stepName}]\n${JSON.stringify(data, null, 2)}\n`;

    // Close box at :end
    if (subStep === 'end') {
        logLine += '-----------------------------------------------------\n';
        if (openBoxes[requestId]) openBoxes[requestId][mainStep] = false;
    }

    // If not inside a box, wrap single log in a box
    if (!subStep && (!openBoxes[requestId] || !openBoxes[requestId][mainStep])) {
        logLine = `-------------------- ${mainStep} --------------------\n` + logLine + '-----------------------------------------------------\n';
    }

    fs.appendFileSync(filePath, logLine + '\n', 'utf8');
}

module.exports = { logRequestStep }; 