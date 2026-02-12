/**
 * API Client
 *
 * HTTP client wrapper with auth header injection,
 * configurable timeouts, and nested response field extraction.
 */

const axios = require('axios');
const { config } = require('../config/testConfig');
const { getToken, clearToken } = require('./authHelper');

/**
 * Call an API endpoint.
 *
 * @param {object} options
 * @param {'GET'|'POST'|'PUT'|'DELETE'} options.method - HTTP method
 * @param {string} options.path - URL path (relative to API_BASE_URL), e.g. "/tts/process"
 * @param {object} [options.body] - Request body (for POST/PUT)
 * @param {object} [options.params] - URL query params (for GET)
 * @param {number} [options.timeout] - Request timeout in ms
 * @param {object} [options.pathParams] - Path parameter replacements, e.g. { conversationId: '123' }
 * @returns {Promise<{ statusCode: number, body: object, latencyMs: number, error: string|null }>}
 */
async function callEndpoint({ method = 'POST', path, body, params, timeout, pathParams }) {
  let resolvedPath = path;

  // Replace path parameters like :conversationId
  if (pathParams) {
    for (const [key, value] of Object.entries(pathParams)) {
      resolvedPath = resolvedPath.replace(`:${key}`, encodeURIComponent(value));
    }
  }

  const url = `${config.API_BASE_URL}${resolvedPath}`;
  const requestTimeout = timeout || config.SYNC_TIMEOUT;

  const startTime = Date.now();
  let token;

  try {
    token = await getToken();
  } catch (err) {
    return {
      statusCode: 0,
      body: null,
      latencyMs: Date.now() - startTime,
      error: `Auth error: ${err.message}`,
    };
  }

  try {
    const axiosConfig = {
      method: method.toLowerCase(),
      url,
      timeout: requestTimeout,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      axiosConfig.data = body;
    }

    if (params) {
      axiosConfig.params = params;
    }

    const response = await axios(axiosConfig);
    const latencyMs = Date.now() - startTime;

    // If token expired, clear cache and retry once
    if (response.status === 401) {
      clearToken();
      const newToken = await getToken();
      axiosConfig.headers['Authorization'] = `Bearer ${newToken}`;

      const retryResponse = await axios(axiosConfig);
      return {
        statusCode: retryResponse.status,
        body: retryResponse.data,
        latencyMs: Date.now() - startTime,
        error: retryResponse.status >= 400 ? (retryResponse.data?.message || `HTTP ${retryResponse.status}`) : null,
      };
    }

    return {
      statusCode: response.status,
      body: response.data,
      latencyMs,
      error: response.status >= 400 ? (response.data?.message || `HTTP ${response.status}`) : null,
    };
  } catch (err) {
    return {
      statusCode: 0,
      body: null,
      latencyMs: Date.now() - startTime,
      error: err.code === 'ECONNABORTED' ? `Timeout after ${requestTimeout}ms` : err.message,
    };
  }
}

/**
 * Extract a nested field from a response body using dot notation.
 * e.g. extractField(body, "data.adapted_text")
 *
 * @param {object} obj
 * @param {string} fieldPath - Dot-separated path
 * @returns {*} The extracted value, or undefined if not found
 */
function extractField(obj, fieldPath) {
  if (!obj || !fieldPath) return undefined;

  const parts = fieldPath.split('.');
  let current = obj;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }

  return current;
}

module.exports = { callEndpoint, extractField };
