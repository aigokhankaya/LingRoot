#!/usr/bin/env node

/**
 * LingRoot Content Quality Test System — CLI Entry Point
 *
 * Usage:
 *   node quality-tests/run.js [options]
 *
 * Options:
 *   --profile <name>     smoke | standard | full (default: smoke)
 *   --area <id>          Test only a specific area (e.g. tts_pipeline)
 *   --level <level>      Test only a specific CEFR level (e.g. A1)
 *   --topic <topic>      Test only a specific topic (e.g. technology)
 *   --dry-run            Validate config and show test plan without API calls
 *   --verbose            Show detailed per-test output
 *   --cost-limit <usd>   Override cost limit (default: 5.00)
 *   --compare <runId>    Compare with a previous run
 *   --list-runs          List previous test runs
 */

const { config, validateConfig } = require('./config/testConfig');
const { runTests } = require('./engine/testRunner');
const { printReport } = require('./reporters/consoleReporter');
const { saveResults, listResults } = require('./reporters/jsonReporter');
const { printTrendReport } = require('./reporters/trendReporter');

/**
 * Parse command line arguments.
 * @param {string[]} args - process.argv.slice(2)
 * @returns {object}
 */
function parseArgs(args) {
  const options = {
    profile: 'smoke',
    area: null,
    level: null,
    topic: null,
    dryRun: false,
    verbose: false,
    costLimit: null,
    compare: null,
    listRuns: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--profile':
        options.profile = args[++i];
        break;
      case '--area':
        options.area = args[++i];
        break;
      case '--level':
        options.level = args[++i];
        break;
      case '--topic':
        options.topic = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--cost-limit':
        options.costLimit = parseFloat(args[++i]);
        break;
      case '--compare':
        options.compare = args[++i];
        break;
      case '--list-runs':
        options.listRuns = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        printHelp();
        process.exit(1);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
LingRoot Content Quality Test System

Usage:
  node quality-tests/run.js [options]

Options:
  --profile <name>     Test profile: smoke (8 tests), standard (48), full (240)
                       Default: smoke
  --area <id>          Test only a specific area
                       Areas: tts_pipeline, podcast, narration, topic_pipeline,
                              topic_narration_preview, ai_chat, quiz, mini_activity
  --level <level>      Test only a specific CEFR level (A1, A2, B1, B2, C1, C2)
  --topic <topic>      Test only a specific topic
                       Topics: technology, food_culture, space, environment, history
  --dry-run            Show test plan and estimated cost without making API calls
  --verbose            Show detailed per-test output
  --cost-limit <usd>   Override cost limit in USD (default: 5.00)
  --compare <runId>    Compare results with a previous run
  --list-runs          List all previous test runs
  --help, -h           Show this help message

Examples:
  node quality-tests/run.js --dry-run
  node quality-tests/run.js --profile smoke
  node quality-tests/run.js --profile smoke --area topic_narration_preview --level B1
  node quality-tests/run.js --profile standard --verbose
  node quality-tests/run.js --profile standard --compare qr_2025-01-15_14-30-00
  node quality-tests/run.js --list-runs
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // List previous runs
  if (args.listRuns) {
    const runs = listResults();
    if (runs.length === 0) {
      console.log('\nNo previous test runs found.\n');
    } else {
      console.log('\nPrevious test runs:');
      for (const run of runs) {
        console.log(`  ${run.filename}  ${run.profile.padEnd(10)}  ${run.timestamp}`);
      }
      console.log('');
    }
    return;
  }

  // Apply cost limit override
  if (args.costLimit && !isNaN(args.costLimit)) {
    config.COST_LIMIT_USD = args.costLimit;
  }

  // Validate configuration
  if (!args.dryRun) {
    const validation = validateConfig();
    if (!validation.valid) {
      console.error('\nConfiguration errors:');
      for (const err of validation.errors) {
        console.error(`  - ${err}`);
      }
      console.error('\nPlease set the required environment variables in backend/.env\n');
      process.exit(1);
    }
  }

  try {
    // Run tests
    const result = await runTests(args);

    // Print console report
    printReport(result, { verbose: args.verbose });

    // Save JSON result (skip for dry run and errors)
    if (!result.dryRun && !result.error) {
      const filePath = saveResults(result);
      console.log(`Results saved to: ${filePath}\n`);

      // Trend comparison
      if (args.compare) {
        printTrendReport(result, args.compare);
      }
    }

    // Exit with non-zero if overall score is FAILING
    if (result.summary && result.summary.grade === 'FAILING') {
      process.exit(2);
    }
  } catch (err) {
    console.error(`\nFatal error: ${err.message}`);
    if (args.verbose) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
