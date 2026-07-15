const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const logger = require('../common/logger.js');

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

function normalizeUrl(candidate, baseUrl) {
  if (!candidate || typeof candidate !== 'string') return null;
  try {
    return new URL(candidate, baseUrl).href;
  } catch {
    return null;
  }
}

function hostnameOf(candidate) {
  try {
    return new URL(candidate).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isGoogleOwnedUrl(candidate = '') {
  const hostname = hostnameOf(candidate);
  return hostname.includes('google.com')
    || hostname.includes('googleusercontent.com')
    || hostname.includes('gstatic.com');
}

function isGoogleNewsUrl(candidate = '') {
  return hostnameOf(candidate).includes('news.google.com');
}

function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token && token.length >= 3);
}

function isLikelyStaticAsset(pathname = '') {
  return /\.(?:css|js|mjs|map|json|xml|txt|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot)(?:$|\?)/i.test(pathname);
}

function isBlockedHost(hostname = '') {
  return /(^|\.)((accounts|support|developers?)\.google\.com|policies\.google\.com|fonts\.(?:googleapis|gstatic)\.com|play\.google\.com|angular\.dev|developer\.[^/]+|docs\.[^/]+)$/i.test(hostname);
}

function isBlockedPath(pathname = '') {
  return /\/(license|licenses|licensing|terms|privacy|about|support|help|docs|documentation|reference|api|policies|account|settings)(\/|$)/i.test(pathname);
}

function isValidCandidate(candidate = '') {
  try {
    const parsed = new URL(candidate);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname || '/';

    if (!/^https?:$/i.test(parsed.protocol)) return false;
    if (isGoogleOwnedUrl(candidate)) return false;
    if (isBlockedHost(hostname)) return false;
    if (isBlockedPath(pathname)) return false;
    if (isLikelyStaticAsset(pathname)) return false;
    if (pathname === '/' || pathname.length < 4) return false;

    return true;
  } catch {
    return false;
  }
}

function extractQueryTargets(candidate, baseUrl) {
  const normalized = normalizeUrl(candidate, baseUrl);
  if (!normalized) return [];

  try {
    const parsed = new URL(normalized);
    const targets = [];
    const paramKeys = ['url', 'u', 'q', 'redirect', 'redirect_url', 'dest', 'destination', 'continue'];
    for (const key of paramKeys) {
      const value = parsed.searchParams.get(key);
      if (!value) continue;
      const resolved = normalizeUrl(value, normalized);
      if (resolved) targets.push({ url: resolved, source: `query:${key}` });
    }
    return targets;
  } catch {
    return [];
  }
}

function extractCandidatesFromDocument(doc, html, finalUrl) {
  const candidates = [];
  const push = (value, source) => {
    const normalized = normalizeUrl(value, finalUrl);
    if (normalized) candidates.push({ url: normalized, source });
  };

  const selectors = [
    ['link[rel="canonical"]', 'canonical'],
    ['link[rel="amphtml"]', 'amphtml'],
    ['meta[property="og:url"]', 'og:url'],
    ['meta[name="twitter:url"]', 'twitter:url'],
  ];

  for (const [selector, source] of selectors) {
    const el = doc.window.document.querySelector(selector);
    if (!el) continue;
    push(el.getAttribute('href') || el.getAttribute('content') || '', source);
  }

  const metaRefresh = doc.window.document.querySelector('meta[http-equiv="refresh"]');
  if (metaRefresh) {
    const content = metaRefresh.getAttribute('content') || '';
    const match = content.match(/url=(.+)$/i);
    if (match && match[1]) {
      push(match[1].trim(), 'meta-refresh');
    }
  }

  const anchors = Array.from(doc.window.document.querySelectorAll('a[href]'));
  for (const anchor of anchors) {
    push(anchor.getAttribute('href') || '', 'anchor');
  }

  const rawUrlMatches = html.match(/https?:\/\/[^"'\\\s<>]+/g) || [];
  for (const match of rawUrlMatches) {
    push(match, 'raw-html');
  }

  const escapedUrlMatches = html.match(/https?:\\\/\\\/[^"'\\\s<>]+/g) || [];
  for (const match of escapedUrlMatches) {
    push(match.replace(/\\\//g, '/'), 'escaped-html');
  }

  return candidates;
}

function scoreCandidate(candidate, context = {}) {
  if (!candidate || !isValidCandidate(candidate.url)) return -1000;

  const { sourceName = '', title = '' } = context;
  const { url, source = 'unknown' } = candidate;
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname || '/';
  const sourceTokens = tokenize(sourceName);
  const titleTokens = tokenize(title).slice(0, 8);

  let score = 0;
  const sourceWeights = {
    canonical: 120,
    amphtml: 100,
    'og:url': 100,
    'twitter:url': 95,
    'meta-refresh': 90,
    anchor: 75,
    'raw-html': 10,
    'escaped-html': 5,
  };

  score += sourceWeights[source] || 0;
  if (parsed.protocol === 'https:') score += 5;
  if (!hostname.includes('news.google.com')) score += 20;
  if (pathname.length > 20) score += 5;
  if (pathname.length > 40) score += 4;
  if (/-|_|\/\d{4}\//.test(pathname)) score += 3;
  if (/article|haber|news|story|video|spor|ekonomi|oyun|world|politics|business|tech/i.test(pathname)) score += 8;
  if (/facebook|instagram|twitter|x\.com|youtube|linkedin|t\.co/i.test(hostname)) score -= 25;

  if (sourceTokens.some((token) => hostname.includes(token) || pathname.includes(token))) {
    score += 15;
  }

  const titleOverlap = titleTokens.filter((token) => pathname.includes(token) || hostname.includes(token)).length;
  score += Math.min(titleOverlap, 3) * 3;

  return score;
}

function chooseBestCandidate(candidates = [], context = {}) {
  const uniqueMap = new Map();

  for (const candidate of candidates) {
    if (!candidate || !candidate.url || !isValidCandidate(candidate.url)) continue;

    const existing = uniqueMap.get(candidate.url);
    if (!existing) {
      uniqueMap.set(candidate.url, candidate);
      continue;
    }

    if (scoreCandidate(candidate, context) > scoreCandidate(existing, context)) {
      uniqueMap.set(candidate.url, candidate);
    }
  }

  const unique = [...uniqueMap.values()];

  if (unique.length === 0) return null;

  unique.sort((a, b) => scoreCandidate(b, context) - scoreCandidate(a, context));
  return unique[0];
}

async function fetchGoogleNewsPage(url) {
  const response = await fetch(url, {
    headers: FETCH_HEADERS,
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Google News fetch failed with status ${response.status}`);
  }

  const finalUrl = response.url || url;
  const html = await response.text();
  const doc = new JSDOM(html, { url: finalUrl });
  return { finalUrl, html, doc };
}

async function resolveGoogleNewsUrl(url, options = {}) {
  const {
    maxDepth = 3,
    requestId = 'google-news-resolver',
    title = '',
    sourceName = '',
  } = options;
  let currentUrl = url;

  for (let depth = 0; depth < maxDepth; depth += 1) {
    if (!isGoogleNewsUrl(currentUrl)) {
      return currentUrl;
    }

    try {
      const { finalUrl, html, doc } = await fetchGoogleNewsPage(currentUrl);

      if (!isGoogleNewsUrl(finalUrl)) {
        logger.info(`[${requestId}] Google News resolved via redirect`, { from: currentUrl, to: finalUrl });
        return finalUrl;
      }

      const candidates = [
        ...extractQueryTargets(currentUrl, finalUrl),
        ...extractQueryTargets(finalUrl, finalUrl),
        ...extractCandidatesFromDocument(doc, html, finalUrl),
      ];

      const bestCandidate = chooseBestCandidate(candidates, { title, sourceName });
      if (!bestCandidate) {
        logger.warn(`[${requestId}] Google News resolver could not find publisher URL`, { url: currentUrl });
        return finalUrl;
      }

      const topCandidates = candidates
        .filter((candidate) => candidate && candidate.url && isValidCandidate(candidate.url))
        .map((candidate) => ({
          url: candidate.url,
          source: candidate.source,
          score: scoreCandidate(candidate, { title, sourceName }),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      logger.info(`[${requestId}] Google News resolved candidate`, {
        from: currentUrl,
        to: bestCandidate.url,
        topCandidates,
      });
      currentUrl = bestCandidate.url;
    } catch (error) {
      logger.warn(`[${requestId}] Google News resolver failed`, { url: currentUrl, error: error.message });
      return currentUrl;
    }
  }

  return currentUrl;
}

module.exports = {
  isGoogleNewsUrl,
  isGoogleOwnedUrl,
  normalizeUrl,
  resolveGoogleNewsUrl,
};
