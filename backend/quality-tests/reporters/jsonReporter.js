/**
 * JSON Reporter
 *
 * Writes test results to a timestamped JSON file in the results/ directory.
 */

const fs = require('fs');
const path = require('path');
const { config } = require('../config/testConfig');

/**
 * Save run results to a JSON file.
 *
 * @param {object} runResult - Complete test run result
 * @returns {string} Path to the saved file
 */
function saveResults(runResult) {
  const resultsDir = config.RESULTS_DIR;

  // Ensure results directory exists
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // Generate filename
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .substring(0, 19);
  const filename = `qr_${timestamp}.json`;
  const filePath = path.join(resultsDir, filename);

  // Add file metadata
  const output = {
    _format: 'lingroot-quality-report-v1',
    _generatedAt: now.toISOString(),
    ...runResult,
  };

  fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf-8');

  return filePath;
}

/**
 * Load a previous result file by run ID (filename without extension).
 *
 * @param {string} runId - e.g. "qr_2025-01-15_14-30-00"
 * @returns {object|null}
 */
function loadResult(runId) {
  const resultsDir = config.RESULTS_DIR;

  // Try exact match first
  let filename = runId.endsWith('.json') ? runId : `${runId}.json`;
  let filePath = path.join(resultsDir, filename);

  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  // Try prefix match (user might give partial ID)
  const files = fs.readdirSync(resultsDir).filter(f => f.startsWith(runId) && f.endsWith('.json'));
  if (files.length > 0) {
    filePath = path.join(resultsDir, files[0]);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  return null;
}

/**
 * List all result files.
 * @returns {{ filename: string, timestamp: string, profile: string }[]}
 */
function listResults() {
  const resultsDir = config.RESULTS_DIR;
  if (!fs.existsSync(resultsDir)) return [];

  return fs.readdirSync(resultsDir)
    .filter(f => f.startsWith('qr_') && f.endsWith('.json'))
    .sort()
    .reverse()
    .map(filename => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(resultsDir, filename), 'utf-8'));
        return {
          filename,
          timestamp: data.metadata?.timestamp || 'unknown',
          profile: data.metadata?.profile || 'unknown',
        };
      } catch {
        return { filename, timestamp: 'unknown', profile: 'unknown' };
      }
    });
}

module.exports = { saveResults, loadResult, listResults };
