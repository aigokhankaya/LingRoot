const { validateRequest } = require('../controllers/videoTopicBriefController.js');
const {
  normalizeBrief,
  stableTopicId,
} = require('../services/videoTopicBriefService.js');

describe('Video TopicBrief contract', () => {
  const request = {
    schema_version: 1,
    topic: 'The seven hills of Istanbul',
    scene_count: 2,
    language: 'en',
  };

  test('accepts the v1 request', () => {
    expect(validateRequest(request)).toBeNull();
  });

  test('rejects invalid scene counts', () => {
    expect(validateRequest({ ...request, scene_count: 0 })).toMatch(/scene_count/);
    expect(validateRequest({ ...request, scene_count: 13 })).toMatch(/scene_count/);
  });

  test('normalizes deterministic scene identifiers and topic id', () => {
    const input = {
      title: 'The Seven Hills of Istanbul',
      coreMessage: 'Discover the historic hills of the old city.',
      category: 'History',
      visualOutline: [
        { narrativeBeat: 'Introduce the peninsula.', altText: 'Aerial view of historic Istanbul.' },
        { narrativeBeat: 'Show the hilltop landmarks.', altText: 'Historic hilltop mosques and streets.' },
      ],
    };
    const brief = normalizeBrief(input, {
      topic: request.topic,
      language: request.language,
      sceneCount: request.scene_count,
    });
    expect(brief.topicId).toBe(stableTopicId(request.topic));
    expect(brief.visualOutline.map((scene) => scene.sceneId)).toEqual([
      'scene-01',
      'scene-02',
    ]);
    expect(brief.visualOutline.map((scene) => scene.order)).toEqual([0, 1]);
  });
});
