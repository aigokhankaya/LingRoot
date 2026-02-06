import { SharedArray } from 'k6/data';

// Load mock texts
const mockTexts = new SharedArray('mock-texts', function () {
  return [JSON.parse(open('../../fixtures/mock-texts.json'))];
});

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * Get a random CEFR level
 * @returns {string}
 */
export function randomLevel() {
  return LEVELS[Math.floor(Math.random() * LEVELS.length)];
}

/**
 * Get a random topic from the mock texts
 * @returns {string}
 */
export function randomTopic() {
  const topics = mockTexts[0].topic_suggestions;
  return topics[Math.floor(Math.random() * topics.length)];
}

/**
 * Get a random text of specified length category
 * @param {'short' | 'medium' | 'long'} size
 * @returns {string}
 */
export function randomText(size = 'medium') {
  return mockTexts[0][size] || mockTexts[0].medium;
}

/**
 * Generate a TTS process-async request body
 * @returns {object}
 */
export function generateTTSPayload() {
  return {
    type: 'text',
    input: randomText('medium'),
    level: randomLevel(),
    voice: 'en-US-Neural2-C',
    speakingRate: 1.05,
  };
}

/**
 * Generate a podcast create-async request body
 * @returns {object}
 */
export function generatePodcastPayload() {
  return {
    topic: randomTopic(),
    level: randomLevel(),
    duration: 5,
    styleType: 'friendly_chat',
  };
}
