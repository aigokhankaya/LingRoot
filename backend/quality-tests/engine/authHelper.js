/**
 * Auth Helper
 *
 * Handles JWT token acquisition for the test user.
 * Caches the token to avoid repeated login calls.
 */

const axios = require('axios');
const { config } = require('../config/testConfig');

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Authenticate with the API and return a JWT token.
 * Uses cached token if still valid.
 * @returns {Promise<string>} JWT access token
 */
async function getToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const { TEST_USER_EMAIL, TEST_USER_PASSWORD, API_BASE_URL } = config;

  if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
    throw new Error('Test user credentials not configured. Set QT_TEST_USER_EMAIL and QT_TEST_USER_PASSWORD in .env');
  }

  const url = `${API_BASE_URL}/auth/login`;

  const response = await axios.post(url, {
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  }, {
    timeout: 30_000,
    validateStatus: () => true,
  });

  if (response.status !== 200 || !response.data?.success) {
    const msg = response.data?.message || response.statusText || 'Unknown error';
    throw new Error(`Auth failed (${response.status}): ${msg}`);
  }

  const token = response.data.data?.token;
  if (!token) {
    throw new Error('Login succeeded but no token returned');
  }

  cachedToken = token;
  // Cache for 50 minutes (tokens typically last 1h+)
  tokenExpiry = now + 50 * 60 * 1000;

  return token;
}

/**
 * Clear the cached token (useful after auth errors).
 */
function clearToken() {
  cachedToken = null;
  tokenExpiry = 0;
}

module.exports = { getToken, clearToken };
