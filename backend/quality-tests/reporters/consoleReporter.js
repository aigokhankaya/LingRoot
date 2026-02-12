/**
 * Console Reporter
 *
 * Prints test results to the terminal with colored output.
 */

// ANSI color codes
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m',
};

/**
 * Get color for a grade.
 * @param {string} grade
 * @returns {string}
 */
function gradeColor(grade) {
  switch (grade) {
    case 'EXCELLENT': return C.green;
    case 'GOOD': return C.green;
    case 'ACCEPTABLE': return C.yellow;
    case 'NEEDS_IMPROVEMENT': return C.yellow;
    case 'FAILING': return C.red;
    default: return C.white;
  }
}

/**
 * Get grade for a score.
 * @param {number} score
 * @returns {string}
 */
function getGrade(score) {
  if (score >= 90) return 'EXCELLENT';
  if (score >= 75) return 'GOOD';
  if (score >= 60) return 'ACCEPTABLE';
  if (score >= 40) return 'NEEDS_IMPROVEMENT';
  return 'FAILING';
}

/**
 * Pad/truncate a string to a fixed width.
 * @param {string} str
 * @param {number} width
 * @returns {string}
 */
function pad(str, width) {
  if (str.length >= width) return str.substring(0, width);
  return str + ' '.repeat(width - str.length);
}

/**
 * Create a score bar visualization.
 * @param {number} score
 * @param {number} [width=20]
 * @returns {string}
 */
function scoreBar(score, width = 20) {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const color = score >= 75 ? C.green : score >= 60 ? C.yellow : C.red;
  return `${color}${'█'.repeat(filled)}${C.dim}${'░'.repeat(empty)}${C.reset}`;
}

/**
 * Print the full console report.
 *
 * @param {object} runResult - Complete test run result
 * @param {object} [options] - Display options
 * @param {boolean} [options.verbose] - Show individual test details
 */
function printReport(runResult, options = {}) {
  const { metadata, summary, byArea, byLevel, results } = runResult;

  // Handle dry run
  if (runResult.dryRun) {
    printDryRunReport(runResult);
    return;
  }

  // Handle error
  if (runResult.error) {
    console.log(`\n${C.red}${C.bold}ERROR:${C.reset} ${runResult.error}\n`);
    return;
  }

  const line = '='.repeat(52);

  console.log(`\n${C.cyan}${C.bold}${line}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  LingRoot Content Quality Report${C.reset}`);
  console.log(`${C.dim}  Profile: ${metadata.profile} | Tests: ${summary.totalTests}${C.reset}`);
  console.log(`${C.dim}  Date: ${metadata.timestamp}${C.reset}`);
  console.log(`${C.dim}  Duration: ${(metadata.durationMs / 1000).toFixed(1)}s | Cost: $${metadata.totalCost.toFixed(2)}${C.reset}`);
  console.log(`${C.cyan}${C.bold}${line}${C.reset}`);

  // Overall Score
  const overallGrade = summary.grade;
  const gc = gradeColor(overallGrade);
  console.log(`\n  ${C.bold}OVERALL SCORE:${C.reset} ${gc}${C.bold}${summary.overallScore}/100${C.reset} ${gc}[${overallGrade}]${C.reset}`);
  console.log(`  ${scoreBar(summary.overallScore, 30)}`);

  // Test Status
  console.log(`\n  ${C.green}Passed: ${summary.passed}${C.reset}  ${C.red}Errors: ${summary.errors}${C.reset}  ${C.dim}Skipped: ${summary.skipped}${C.reset}`);

  // By Area
  if (Object.keys(byArea).length > 0) {
    console.log(`\n  ${C.bold}BY AREA:${C.reset}`);
    const sortedAreas = Object.entries(byArea).sort((a, b) => b[1].avgScore - a[1].avgScore);
    for (const [id, data] of sortedAreas) {
      const grade = getGrade(data.avgScore);
      const color = gradeColor(grade);
      const label = pad(data.label, 28);
      const dots = '.'.repeat(Math.max(0, 28 - data.label.length));
      console.log(`    ${label}${C.dim}${dots}${C.reset} ${color}${data.avgScore.toFixed(1).padStart(5)}${C.reset} ${color}[${grade}]${C.reset}`);
    }
  }

  // By CEFR Level
  if (Object.keys(byLevel).length > 0) {
    console.log(`\n  ${C.bold}BY CEFR LEVEL:${C.reset}`);
    const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    for (const level of levelOrder) {
      const data = byLevel[level];
      if (!data) continue;
      const grade = getGrade(data.avgScore);
      const color = gradeColor(grade);
      const label = pad(level, 28);
      const dots = '.'.repeat(24);
      console.log(`    ${label}${C.dim}${dots}${C.reset} ${color}${data.avgScore.toFixed(1).padStart(5)}${C.reset} ${color}[${grade}]${C.reset}`);
    }
  }

  // Error details
  const errors = results.filter(r => r.status === 'ERROR');
  if (errors.length > 0) {
    console.log(`\n  ${C.red}${C.bold}ERRORS:${C.reset}`);
    for (const err of errors) {
      console.log(`    ${C.red}✗${C.reset} ${err.testId}: ${err.error}`);
    }
  }

  // Verbose: individual test results
  if (options.verbose && results.length > 0) {
    console.log(`\n  ${C.bold}DETAILED RESULTS:${C.reset}`);
    for (const r of results) {
      if (r.status === 'PASS') {
        const grade = r.scores.grade;
        const color = gradeColor(grade);
        console.log(`    ${C.green}✓${C.reset} ${pad(r.testId, 40)} ${color}${r.scores.overallScore.toFixed(1).padStart(5)}${C.reset} [${grade}] ${C.dim}${r.latencyMs}ms${C.reset}`);
      } else if (r.status === 'ERROR') {
        console.log(`    ${C.red}✗${C.reset} ${pad(r.testId, 40)} ${C.red}ERROR${C.reset} ${C.dim}${r.error}${C.reset}`);
      } else {
        console.log(`    ${C.dim}○ ${pad(r.testId, 40)} SKIPPED${C.reset}`);
      }
    }
  }

  console.log(`\n${C.cyan}${C.bold}${line}${C.reset}\n`);
}

/**
 * Print dry run report.
 * @param {object} result
 */
function printDryRunReport(result) {
  console.log(`\n${C.cyan}${C.bold}========================================${C.reset}`);
  console.log(`${C.cyan}${C.bold}  LingRoot Quality Test — DRY RUN${C.reset}`);
  console.log(`${C.cyan}${C.bold}========================================${C.reset}`);
  console.log(`\n  Profile: ${result.profile}`);
  console.log(`  Total tests: ${C.bold}${result.testCount}${C.reset}`);
  console.log(`  Estimated cost: ${C.bold}$${result.estimatedCost.toFixed(2)}${C.reset}`);

  console.log(`\n  ${C.bold}Test Plan:${C.reset}`);
  for (const tc of result.testPlan) {
    console.log(`    ${C.dim}•${C.reset} ${pad(tc.area, 25)} ${pad(tc.level, 5)} ${tc.topic}`);
  }
  console.log('');
}

module.exports = { printReport };
