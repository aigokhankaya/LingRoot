import { SharedArray } from 'k6/data';

// Load test users from JSON file (loaded once, shared across VUs)
const testUsers = new SharedArray('test-users', function () {
  return JSON.parse(open('../../fixtures/test-users.json'));
});

/**
 * Get a test user based on VU ID (deterministic mapping)
 * @returns {{ userId: string, email: string, token: string }}
 */
export function getTestUser() {
  const vuIndex = (__VU - 1) % testUsers.length;
  return testUsers[vuIndex];
}

/**
 * Scenario-based user pool ranges to prevent VU collision across scenarios.
 * TTS VUs get users 0-4749, Podcast VUs get 4750-4999, others get full range.
 * Sized for 5000-user pool (stress-5000vu). Works with smaller pools via modulo in getTestUserForScenario.
 */
const scenarioRanges = {
  tts: { start: 0, end: 4749 },
  podcast: { start: 4750, end: 4999 },
  default: { start: 0, end: 4999 },
};

/**
 * Get a test user scoped to a scenario's user pool.
 * Prevents cross-scenario VU ID collisions (e.g. VU 1001 != VU 1).
 * @param {string} scenario - Scenario key: 'tts', 'podcast', or 'default'
 * @returns {{ userId: string, email: string, token: string }}
 */
export function getTestUserForScenario(scenario) {
  const range = scenarioRanges[scenario] || scenarioRanges.default;
  const poolSize = range.end - range.start + 1;
  const idx = range.start + ((__VU - 1) % poolSize);
  const safeIdx = idx % testUsers.length;
  return testUsers[safeIdx];
}

/**
 * Get authorization headers for the current VU
 * @param {string} [scenario] - Optional scenario key for scoped user pool
 * @returns {object} Headers with Authorization bearer token
 */
export function getAuthHeaders(scenario) {
  const user = scenario ? getTestUserForScenario(scenario) : getTestUser();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user.token}`,
  };
}

export { testUsers };
