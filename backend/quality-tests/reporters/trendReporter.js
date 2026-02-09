/**
 * Trend Reporter
 *
 * Compares current results with a previous run to show improvements/regressions.
 */

const { loadResult, listResults } = require('./jsonReporter');

// ANSI color codes
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

/**
 * Format a score delta with color and arrow.
 * @param {number} delta
 * @returns {string}
 */
function formatDelta(delta) {
  if (delta > 0) return `${C.green}↑ +${delta.toFixed(1)}${C.reset}`;
  if (delta < 0) return `${C.red}↓ ${delta.toFixed(1)}${C.reset}`;
  return `${C.dim}= 0.0${C.reset}`;
}

/**
 * Print a trend comparison between current and previous run.
 *
 * @param {object} currentResult - Current test run result
 * @param {string} [compareRunId] - Previous run ID to compare with
 */
function printTrendReport(currentResult, compareRunId) {
  let previousResult = null;

  if (compareRunId) {
    previousResult = loadResult(compareRunId);
    if (!previousResult) {
      console.log(`\n${C.yellow}Warning: Previous run "${compareRunId}" not found.${C.reset}`);
      // Try to find the most recent result
      const results = listResults();
      if (results.length > 1) {
        // Skip first (current), use second (previous)
        previousResult = loadResult(results[1].filename);
        if (previousResult) {
          console.log(`${C.dim}Using most recent previous run: ${results[1].filename}${C.reset}`);
        }
      }
    }
  } else {
    // Auto-find previous run
    const results = listResults();
    if (results.length > 1) {
      previousResult = loadResult(results[1].filename);
    }
  }

  if (!previousResult) {
    console.log(`\n${C.dim}No previous results found for comparison.${C.reset}\n`);
    return;
  }

  console.log(`\n${C.cyan}${C.bold}========================================${C.reset}`);
  console.log(`${C.cyan}${C.bold}  Trend Comparison${C.reset}`);
  console.log(`${C.cyan}${C.bold}========================================${C.reset}`);
  console.log(`\n  ${C.dim}Current:  ${currentResult.metadata?.timestamp || 'now'}${C.reset}`);
  console.log(`  ${C.dim}Previous: ${previousResult.metadata?.timestamp || 'unknown'}${C.reset}`);

  // Overall score delta
  const currentOverall = currentResult.summary?.overallScore || 0;
  const previousOverall = previousResult.summary?.overallScore || 0;
  const overallDelta = currentOverall - previousOverall;

  console.log(`\n  ${C.bold}OVERALL:${C.reset} ${currentOverall.toFixed(1)} ${formatDelta(overallDelta)}`);

  // By area comparison
  const currentAreas = currentResult.byArea || {};
  const previousAreas = previousResult.byArea || {};
  const allAreaIds = new Set([...Object.keys(currentAreas), ...Object.keys(previousAreas)]);

  if (allAreaIds.size > 0) {
    console.log(`\n  ${C.bold}BY AREA:${C.reset}`);
    const improved = [];
    const regressed = [];

    for (const id of allAreaIds) {
      const curr = currentAreas[id]?.avgScore || 0;
      const prev = previousAreas[id]?.avgScore || 0;
      const delta = curr - prev;
      const label = currentAreas[id]?.label || previousAreas[id]?.label || id;

      const padded = label.padEnd(25);
      console.log(`    ${padded} ${curr.toFixed(1).padStart(5)} ${formatDelta(delta)}`);

      if (delta > 2) improved.push(label);
      if (delta < -2) regressed.push(label);
    }

    if (improved.length > 0) {
      console.log(`\n  ${C.green}${C.bold}Improved:${C.reset} ${improved.join(', ')}`);
    }
    if (regressed.length > 0) {
      console.log(`  ${C.red}${C.bold}Regressed:${C.reset} ${regressed.join(', ')}`);
    }
  }

  // By level comparison
  const currentLevels = currentResult.byLevel || {};
  const previousLevels = previousResult.byLevel || {};
  const allLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const hasLevelData = allLevels.some(l => currentLevels[l] || previousLevels[l]);
  if (hasLevelData) {
    console.log(`\n  ${C.bold}BY CEFR LEVEL:${C.reset}`);
    for (const level of allLevels) {
      const curr = currentLevels[level]?.avgScore;
      const prev = previousLevels[level]?.avgScore;
      if (curr === undefined && prev === undefined) continue;
      const delta = (curr || 0) - (prev || 0);
      console.log(`    ${level.padEnd(25)} ${(curr || 0).toFixed(1).padStart(5)} ${formatDelta(delta)}`);
    }
  }

  console.log(`\n${C.cyan}${C.bold}========================================${C.reset}\n`);
}

module.exports = { printTrendReport };
