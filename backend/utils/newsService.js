// News aggregation service for hashtag/hobby topics
// Fetches latest news from multiple providers (NewsAPI, Twitter, Google News RSS fallback)
// NOTE: Requires API keys in environment variables for some providers

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Environment-driven configuration
const NEWS_API_PROVIDER = process.env.NEWS_API_PROVIDER || 'none'; // e.g. 'newsapi'
const NEWS_API_KEY = process.env.NEWS_API_KEY || process.env.NEWSAPI_API_KEY || '';
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || '';

/**
 * Normalized news item interface
 * @typedef {Object} NormalizedNewsItem
 * @property {string} id
 * @property {string} title
 * @property {string} summary
 * @property {string} url
 * @property {string} source
 * @property {string} [sourceName]
 * @property {string} [author]
 * @property {string} [publishedAt]
 * @property {string} [language]
 * @property {string} [type] - 'twitter' | 'news' | 'web'
 */

/**
 * Fetch news via NewsAPI (https://newsapi.org/) if configured.
 * @param {string} topic
 * @param {number} limit
 * @returns {Promise<NormalizedNewsItem[]>}
 */
async function fetchNewsApi(topic, limit) {
  if (!NEWS_API_KEY || NEWS_API_PROVIDER.toLowerCase() !== 'newsapi') {
    return [];
  }

  try {
    const pageSize = Math.min(Math.max(limit, 1), 50);
    const url = 'https://newsapi.org/v2/everything';

    const resp = await axios.get(url, {
      params: {
        q: topic,
        sortBy: 'publishedAt',
        language: 'en',
        pageSize,
      },
      headers: {
        'X-Api-Key': NEWS_API_KEY,
      },
      timeout: 8000,
    });

    const articles = Array.isArray(resp.data && resp.data.articles)
      ? resp.data.articles
      : [];

    return articles.map((a) => ({
      id: uuidv4(),
      title: a.title || '(No title)',
      summary: a.description || a.content || '',
      url: a.url,
      source: 'newsapi',
      sourceName: (a.source && a.source.name) || 'NewsAPI',
      author: a.author || undefined,
      publishedAt: a.publishedAt || undefined,
      language: 'en',
      type: 'news',
    }));
  } catch (err) {
    logger.error('[newsService] NewsAPI fetch failed', { error: err.message });
    return [];
  }
}

/**
 * Fetch recent tweets for a hashtag using Twitter API v2 (if configured).
 * NOTE: This requires a valid TWITTER_BEARER_TOKEN and appropriate API access level.
 * @param {string} hashtag
 * @param {number} limit
 * @returns {Promise<NormalizedNewsItem[]>}
 */
async function fetchTwitterHashtag(hashtag, limit) {
  if (!TWITTER_BEARER_TOKEN) return [];

  // Normalize hashtag (remove leading # for query building)
  const tag = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag;

  try {
    const maxResults = Math.min(Math.max(limit, 10), 100);
    const url = 'https://api.twitter.com/2/tweets/search/recent';

    const resp = await axios.get(url, {
      params: {
        query: `#${tag} lang:en -is:retweet`,
        'tweet.fields': 'created_at,lang,author_id',
        max_results: maxResults,
      },
      headers: {
        Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`,
      },
      timeout: 8000,
    });

    const tweets = Array.isArray(resp.data && resp.data.data)
      ? resp.data.data
      : [];

    return tweets.map((t) => ({
      id: uuidv4(),
      title: t.text.slice(0, 120),
      summary: t.text,
      url: `https://twitter.com/i/web/status/${t.id}`,
      source: 'twitter',
      sourceName: 'Twitter',
      author: t.author_id ? `user:${t.author_id}` : undefined,
      publishedAt: t.created_at,
      language: t.lang || 'en',
      type: 'twitter',
    }));
  } catch (err) {
    logger.error('[newsService] Twitter fetch failed', { error: err.message });
    return [];
  }
}

/**
 * Fallback: use Google News RSS (public feed) without API key.
 * This gives us recent news for a general topic string.
 * @param {string} topic
 * @param {number} limit
 * @returns {Promise<NormalizedNewsItem[]>}
 */
async function fetchGoogleNewsRSS(topic, limit) {
  try {
    const q = encodeURIComponent(topic);
    const rssUrl = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;

    const resp = await axios.get(rssUrl, {
      timeout: 8000,
      responseType: 'text',
    });

    const $ = cheerio.load(resp.data, { xmlMode: true });
    const items = [];

    $('item').each((_, el) => {
      if (items.length >= limit) return false;

      const title = $(el).find('title').first().text() || '(No title)';
      let link = $(el).find('link').first().text();
      const pubDate = $(el).find('pubDate').first().text();
      const description = $(el).find('description').first().text();

      // Some Google News links are redirect URLs; keep as-is for now
      if (!link) link = description || '';

      items.push({
        id: uuidv4(),
        title,
        summary: description || '',
        url: link,
        source: 'google_news_rss',
        sourceName: 'Google News',
        publishedAt: pubDate || undefined,
        language: 'en',
        type: 'news',
      });
    });

    return items;
  } catch (err) {
    logger.error('[newsService] Google News RSS fetch failed', { error: err.message });
    return [];
  }
}

/**
 * Public API: get latest updates for a given hobby/topic/hashtag.
 * Aggregates from available providers, sorts by time and trims to `limit`.
 * @param {Object} params
 * @param {string} params.query - Topic, hobby or hashtag string
 * @param {number} params.limit - Max results to return (1-50)
 * @param {string} [params.language] - Optional language code (currently informational)
 * @returns {Promise<NormalizedNewsItem[]>}
 */
async function getNewsForTopic({ query, limit = 10, language = 'en' }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const trimmedQuery = (query || '').trim();

  if (!trimmedQuery) {
    return [];
  }

  const requestId = uuidv4();
  logger.info(`[newsService] Fetching news for query="${trimmedQuery}" limit=${safeLimit}`, { requestId });

  const tasks = [];

  // General news providers
  tasks.push(fetchGoogleNewsRSS(trimmedQuery, safeLimit));
  tasks.push(fetchNewsApi(trimmedQuery, safeLimit));

  // Twitter only makes sense for real hashtags
  if (trimmedQuery.startsWith('#')) {
    tasks.push(fetchTwitterHashtag(trimmedQuery, safeLimit));
  }

  const resultsNested = await Promise.allSettled(tasks);

  const allItems = resultsNested
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => /** @type {any} */ (r).value || []);

  // Deduplicate by URL + title
  const seen = new Set();
  const deduped = [];
  for (const item of allItems) {
    const key = `${item.url || ''}__${item.title || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  // Sort by publishedAt desc when available
  deduped.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });

  const finalItems = deduped.slice(0, safeLimit);

  logger.info(`[newsService] Returning ${finalItems.length} items for query="${trimmedQuery}"`, { requestId });

  return finalItems;
}

module.exports = {
  getNewsForTopic,
};
