/**
 * Test Runner
 *
 * Orchestrates quality tests: auth → setup → run tests → score → report.
 * Serial execution by default to respect API rate limits.
 * Tracks cumulative cost and stops if limit is exceeded.
 */

const { config } = require('../config/testConfig');
const testCasesData = require('../config/testCases.json');
const { getToken } = require('./authHelper');
const { callEndpoint, extractField } = require('./apiClient');
const { calculateCompositeScore } = require('../scoring/compositeScorer');

/**
 * Build the list of test cases to run based on CLI options.
 *
 * @param {object} options
 * @param {string} options.profile - smoke | standard | full | single
 * @param {string} [options.area] - Specific area ID
 * @param {string} [options.level] - Specific CEFR level
 * @param {string} [options.topic] - Specific topic ID
 * @returns {object[]} Array of test case objects
 */
function buildTestPlan(options) {
  const profileDef = testCasesData.profiles[options.profile];
  if (!profileDef && options.profile !== 'single') {
    throw new Error(`Unknown profile: ${options.profile}. Use: smoke, standard, full, single`);
  }

  const levels = options.level
    ? [options.level.toUpperCase()]
    : (profileDef?.levels || ['B1']);

  const topicCount = options.topic ? 1 : (profileDef?.topicCount || 1);

  const areas = options.area
    ? testCasesData.areas.filter(a => a.id === options.area)
    : testCasesData.areas;

  if (areas.length === 0) {
    throw new Error(`Area not found: ${options.area}`);
  }

  const topics = options.topic
    ? testCasesData.topics.filter(t => t.id === options.topic)
    : testCasesData.topics.slice(0, topicCount);

  const plan = [];

  for (const area of areas) {
    for (const level of levels) {
      for (const topic of topics) {
        plan.push({
          id: `${area.id}_${level}_${topic.id}`,
          areaId: area.id,
          areaLabel: area.label,
          level,
          topicId: topic.id,
          topicLabel: topic.label,
          sampleInput: topic.sampleInput,
          keywords: topic.keywords,
          area,
          topic,
        });
      }
    }
  }

  // Add edge cases for standard and full profiles
  if (profileDef?.includeEdgeCases) {
    for (const edge of testCasesData.edgeCases) {
      const matchingAreas = areas.filter(a => edge.areaIds.includes(a.id));
      for (const area of matchingAreas) {
        plan.push({
          id: `${area.id}_${edge.level}_edge_${edge.id}`,
          areaId: area.id,
          areaLabel: area.label,
          level: edge.level,
          topicId: `edge_${edge.id}`,
          topicLabel: edge.label,
          sampleInput: edge.sampleInput,
          keywords: [],
          area,
          topic: { id: `edge_${edge.id}`, label: edge.label, sampleInput: edge.sampleInput, keywords: [] },
          isEdgeCase: true,
        });
      }
    }
  }

  return plan;
}

/**
 * Resolve the request body from a template, substituting placeholders.
 *
 * @param {object} template
 * @param {object} testCase
 * @returns {object}
 */
function resolveBody(template, testCase) {
  const body = {};
  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string') {
      body[key] = value
        .replace('{{sampleInput}}', testCase.sampleInput || '')
        .replace('{{level}}', testCase.level || '')
        .replace('{{topicLabel}}', testCase.topicLabel || '')
        .replace('{{topicId}}', testCase.topicId || '');
    } else {
      body[key] = value;
    }
  }
  return body;
}

/**
 * Extract text output from API response, trying primary and alternate fields.
 *
 * @param {object} responseBody
 * @param {object} area
 * @returns {string|null}
 */
function extractOutputText(responseBody, area) {
  const endpoint = area.endpoint;

  // Try primary output field
  let text = extractField(responseBody, endpoint.outputField);

  // Try alternate fields if primary is empty
  if (!text && endpoint.alternateOutputFields) {
    for (const altField of endpoint.alternateOutputFields) {
      text = extractField(responseBody, altField);
      if (text) break;
    }
  }

  // Handle quiz scoring mode — extract text from questions
  if (area.scoringMode === 'quiz' && Array.isArray(text)) {
    return text.map(q => {
      const parts = [q.question || ''];
      if (Array.isArray(q.options)) parts.push(...q.options);
      return parts.join(' ');
    }).join(' ');
  }

  // Handle activity scoring mode — extract text from activity object
  if (area.scoringMode === 'activity' && typeof text === 'object' && text !== null) {
    return JSON.stringify(text);
  }

  if (typeof text === 'string') return text;
  if (typeof text === 'object' && text !== null) return JSON.stringify(text);
  return null;
}

/**
 * Create resources needed before tests (conversation for chat, content ID for quiz).
 *
 * @param {string} setupType - "conversation" | "content"
 * @returns {Promise<object>} Setup data
 */
async function runSetup(setupType) {
  const setupData = {};

  if (setupType === 'conversation') {
    const result = await callEndpoint({
      method: 'POST',
      path: '/ai-chat/conversations',
      body: { title: 'Quality Test Conversation' },
    });

    if (result.error) {
      throw new Error(`Failed to create conversation: ${result.error}`);
    }

    setupData.conversationId = extractField(result.body, 'data.id');
    if (!setupData.conversationId) {
      throw new Error('Created conversation but no ID returned');
    }
  }

  if (setupType === 'content') {
    // For quiz, we need an existing content with words.
    // Try to create one via topic pipeline first.
    const result = await callEndpoint({
      method: 'POST',
      path: '/topic-pipeline/generate',
      body: { topic: 'Technology', level: 'B1' },
    });

    if (!result.error) {
      // Try to extract a content ID from the response
      setupData.contentId = extractField(result.body, 'data.contenthistory_id') ||
                            extractField(result.body, 'data.content_id') ||
                            extractField(result.body, 'data.id');
    }
  }

  return setupData;
}

/**
 * Run a single test case.
 *
 * @param {object} testCase
 * @param {object} setupData - Pre-created resources
 * @param {object} runState - Shared state (cost tracking)
 * @param {object} options - CLI options (verbose, etc.)
 * @returns {Promise<object>} Test result
 */
async function runSingleTest(testCase, setupData, runState, options) {
  const { area } = testCase;
  const endpoint = area.endpoint;
  const startTime = Date.now();

  // Check cost limit
  const estimatedCost = (config.COST_ESTIMATES[area.id] || 0.05) * (area.costMultiplier || 1);
  if (runState.totalCost + estimatedCost > config.COST_LIMIT_USD) {
    return {
      testId: testCase.id,
      status: 'SKIPPED',
      reason: `Cost limit would be exceeded ($${runState.totalCost.toFixed(2)} + $${estimatedCost.toFixed(2)} > $${config.COST_LIMIT_USD.toFixed(2)})`,
      latencyMs: 0,
      scores: null,
    };
  }

  if (options.verbose) {
    process.stdout.write(`  Running: ${testCase.id} ... `);
  }

  // Build request body
  const body = resolveBody(endpoint.bodyTemplate, testCase);

  // Inject setup data (conversation ID, content ID)
  const pathParams = {};
  if (area.requiresSetup === 'conversation' && setupData.conversationId) {
    pathParams.conversationId = setupData.conversationId;
  }
  if (area.requiresSetup === 'content' && setupData.contentId) {
    body.contentId = setupData.contentId;
  }

  // Make API call
  const result = await callEndpoint({
    method: endpoint.method,
    path: endpoint.path,
    body: endpoint.method !== 'GET' ? body : undefined,
    params: endpoint.method === 'GET' ? body : undefined,
    timeout: endpoint.timeout || config.SYNC_TIMEOUT,
    pathParams,
  });

  // Track cost
  runState.totalCost += estimatedCost;

  if (result.error) {
    if (options.verbose) {
      process.stdout.write(`FAIL (${result.error})\n`);
    }
    return {
      testId: testCase.id,
      areaId: area.id,
      areaLabel: area.label,
      level: testCase.level,
      topicId: testCase.topicId,
      topicLabel: testCase.topicLabel,
      status: 'ERROR',
      error: result.error,
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      estimatedCost,
      scores: null,
    };
  }

  // Extract output text
  const outputText = extractOutputText(result.body, area);

  if (!outputText) {
    if (options.verbose) {
      process.stdout.write(`FAIL (no output text)\n`);
    }
    return {
      testId: testCase.id,
      areaId: area.id,
      areaLabel: area.label,
      level: testCase.level,
      topicId: testCase.topicId,
      topicLabel: testCase.topicLabel,
      status: 'ERROR',
      error: 'No text output extracted from response',
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      estimatedCost,
      scores: null,
    };
  }

  // Score the output
  const scores = calculateCompositeScore({
    text: outputText,
    targetLevel: testCase.level,
    topic: testCase.topicLabel,
    areaId: area.id,
    originalText: area.hasOriginalText ? testCase.sampleInput : undefined,
    expectedKeywords: testCase.keywords,
  });

  if (options.verbose) {
    process.stdout.write(`${scores.overallScore.toFixed(1)} [${scores.grade}]\n`);
  }

  return {
    testId: testCase.id,
    areaId: area.id,
    areaLabel: area.label,
    level: testCase.level,
    topicId: testCase.topicId,
    topicLabel: testCase.topicLabel,
    status: 'PASS',
    statusCode: result.statusCode,
    latencyMs: result.latencyMs,
    estimatedCost,
    outputTextLength: outputText.length,
    outputTextPreview: outputText.substring(0, 200),
    scores,
  };
}

/**
 * Run all tests in the plan.
 *
 * @param {object} options - CLI options
 * @returns {Promise<object>} Full run result
 */
async function runTests(options) {
  const runStart = Date.now();
  const profile = options.profile || 'smoke';

  // Build test plan
  const testPlan = buildTestPlan({
    profile,
    area: options.area,
    level: options.level,
    topic: options.topic,
  });

  if (testPlan.length === 0) {
    return { error: 'No test cases match the given filters', results: [] };
  }

  // Dry run mode
  if (options.dryRun) {
    return {
      dryRun: true,
      profile,
      testCount: testPlan.length,
      estimatedCost: testPlan.reduce((sum, tc) => {
        const area = tc.area;
        return sum + (config.COST_ESTIMATES[area.id] || 0.05) * (area.costMultiplier || 1);
      }, 0),
      testPlan: testPlan.map(tc => ({
        id: tc.id,
        area: tc.areaLabel,
        level: tc.level,
        topic: tc.topicLabel,
      })),
    };
  }

  console.log(`\nStarting quality tests...`);
  console.log(`  Profile: ${profile}`);
  console.log(`  Tests: ${testPlan.length}`);
  console.log(`  Cost limit: $${config.COST_LIMIT_USD.toFixed(2)}`);
  console.log('');

  // Authenticate
  console.log('Authenticating...');
  try {
    await getToken();
    console.log('Authentication successful.\n');
  } catch (err) {
    return { error: `Authentication failed: ${err.message}`, results: [] };
  }

  // Setup phase — create shared resources
  console.log('Setting up test resources...');
  const setupData = {};
  const requiredSetups = new Set(testPlan.map(tc => tc.area.requiresSetup).filter(Boolean));

  for (const setupType of requiredSetups) {
    try {
      const data = await runSetup(setupType);
      Object.assign(setupData, data);
      console.log(`  ${setupType}: OK`);
    } catch (err) {
      console.log(`  ${setupType}: FAILED (${err.message})`);
    }
  }
  console.log('');

  // Run tests sequentially
  const runState = { totalCost: 0 };
  const results = [];

  for (let i = 0; i < testPlan.length; i++) {
    const testCase = testPlan[i];

    if (!options.verbose) {
      process.stdout.write(`\r  [${i + 1}/${testPlan.length}] Testing ${testCase.areaLabel} | ${testCase.level} | ${testCase.topicLabel}...`);
    }

    const result = await runSingleTest(testCase, setupData, runState, options);
    results.push(result);

    // Stop if cost limit hit
    if (result.status === 'SKIPPED' && result.reason?.includes('Cost limit')) {
      console.log(`\n\nCost limit reached ($${runState.totalCost.toFixed(2)}). Stopping.`);
      break;
    }
  }

  if (!options.verbose) {
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
  }

  const runEnd = Date.now();

  // Compute aggregates
  const passedResults = results.filter(r => r.status === 'PASS');
  const errorResults = results.filter(r => r.status === 'ERROR');
  const skippedResults = results.filter(r => r.status === 'SKIPPED');

  const byArea = {};
  const byLevel = {};

  for (const r of passedResults) {
    if (!byArea[r.areaId]) byArea[r.areaId] = { label: r.areaLabel, scores: [] };
    byArea[r.areaId].scores.push(r.scores.overallScore);

    if (!byLevel[r.level]) byLevel[r.level] = { scores: [] };
    byLevel[r.level].scores.push(r.scores.overallScore);
  }

  const areaAverages = {};
  for (const [id, data] of Object.entries(byArea)) {
    areaAverages[id] = {
      label: data.label,
      avgScore: parseFloat((data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(1)),
      testCount: data.scores.length,
    };
  }

  const levelAverages = {};
  for (const [level, data] of Object.entries(byLevel)) {
    levelAverages[level] = {
      avgScore: parseFloat((data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(1)),
      testCount: data.scores.length,
    };
  }

  const allScores = passedResults.map(r => r.scores.overallScore);
  const overallAvg = allScores.length > 0
    ? parseFloat((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1))
    : 0;

  return {
    metadata: {
      profile,
      timestamp: new Date().toISOString(),
      durationMs: runEnd - runStart,
      totalCost: parseFloat(runState.totalCost.toFixed(2)),
      costLimit: config.COST_LIMIT_USD,
    },
    summary: {
      totalTests: results.length,
      passed: passedResults.length,
      errors: errorResults.length,
      skipped: skippedResults.length,
      overallScore: overallAvg,
      grade: overallAvg >= 90 ? 'EXCELLENT' : overallAvg >= 75 ? 'GOOD' : overallAvg >= 60 ? 'ACCEPTABLE' : overallAvg >= 40 ? 'NEEDS_IMPROVEMENT' : 'FAILING',
    },
    byArea: areaAverages,
    byLevel: levelAverages,
    results,
  };
}

module.exports = { runTests, buildTestPlan };
