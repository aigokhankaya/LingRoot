const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const logger = require('../utils/common/logger.js');

let openai = null;

function getOpenAI() {
  if (openai) return openai;
  const apiKey = (process.env.OPENAI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!apiKey) return null;
  openai = new OpenAI({ apiKey });
  return openai;
}

class VideoTopicBriefError extends Error {
  constructor(message, statusCode = 500, retryable = false) {
    super(message);
    this.name = 'VideoTopicBriefError';
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

function stableTopicId(topic) {
  const slug = topic
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const digest = crypto.createHash('sha256').update(topic).digest('hex').slice(0, 8);
  return `${slug || 'topic'}-${digest}`;
}

function normalizeBrief(raw, { topic, topicId, language, sceneCount }) {
  if (!raw || typeof raw !== 'object') {
    throw new VideoTopicBriefError('Topic generation returned an invalid object.', 502, true);
  }
  const outline = Array.isArray(raw.visualOutline) ? raw.visualOutline : [];
  if (outline.length !== sceneCount) {
    throw new VideoTopicBriefError(
      `Topic generation returned ${outline.length} scenes; ${sceneCount} required.`,
      502,
      true,
    );
  }
  const requiredStrings = [raw.title, raw.coreMessage, raw.category];
  if (requiredStrings.some((value) => typeof value !== 'string' || !value.trim())) {
    throw new VideoTopicBriefError('Topic generation omitted required text.', 502, true);
  }
  const visualOutline = outline.map((scene, order) => {
    if (
      !scene ||
      typeof scene.narrativeBeat !== 'string' ||
      !scene.narrativeBeat.trim() ||
      typeof scene.altText !== 'string' ||
      !scene.altText.trim()
    ) {
      throw new VideoTopicBriefError('Topic generation returned an invalid visual scene.', 502, true);
    }
    return {
      sceneId: `scene-${String(order + 1).padStart(2, '0')}`,
      order,
      narrativeBeat: scene.narrativeBeat.trim(),
      altText: scene.altText.trim(),
    };
  });
  return {
    schemaVersion: 1,
    topicId: topicId || stableTopicId(topic),
    title: raw.title.trim(),
    coreMessage: raw.coreMessage.trim(),
    category: raw.category.trim(),
    language,
    visualOutline,
  };
}

async function generateVideoTopicBrief({ topic, topicId, language, sceneCount }) {
  const client = getOpenAI();
  if (!client) {
    throw new VideoTopicBriefError('OpenAI client not configured.', 503, true);
  }
  const prompt = fs
    .readFileSync(path.join(__dirname, '../prompts/video-topic-brief.txt'), 'utf8')
    .replace(/{{topic}}/g, topic)
    .replace(/{{language}}/g, language)
    .replace(/{{scene_count}}/g, String(sceneCount));
  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_VIDEO_FACTORY_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You create factual video briefs and return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });
    const content = completion.choices[0]?.message?.content;
    return normalizeBrief(JSON.parse(content), { topic, topicId, language, sceneCount });
  } catch (error) {
    if (error instanceof VideoTopicBriefError) throw error;
    logger.error(`[VideoTopicBrief] Generation failed: ${error.message}`);
    throw new VideoTopicBriefError('Topic brief generation failed.', 502, true);
  }
}

module.exports = {
  generateVideoTopicBrief,
  normalizeBrief,
  stableTopicId,
  VideoTopicBriefError,
};
