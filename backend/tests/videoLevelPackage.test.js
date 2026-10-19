const { validateRequest } = require('../controllers/videoLevelPackageController.js');

describe('Video level package contract', () => {
  const request = {
    schema_version: 1,
    topic_id: 'long-topic',
    topic: 'A detailed topic',
    core_message: 'Explain the topic carefully.',
    target_level: 'B2',
    target_duration_seconds: 330,
    language: 'en',
    voice_profile: 'openai_marin',
    audio_quality: 'high',
    subtitle_format: 'srt',
    content_style: 'long_form_listening_video',
    content_objective: 'education',
    tone: 'professional',
    brand: 'LingRoot',
    scene_ids: Array.from({ length: 12 }, (_, index) => `scene-${index + 1}`),
    scene_briefs: Array.from({ length: 12 }, (_, index) => ({
      scene_id: `scene-${index + 1}`,
      narrative_beat: `Explain part ${index + 1}.`,
    })),
  };

  test('accepts a long-form request from five to ten minutes', () => {
    expect(validateRequest(request)).toBeNull();
    expect(validateRequest({ ...request, target_duration_seconds: 600 })).toBeNull();
  });

  test('rejects durations beyond ten minutes and unknown content styles', () => {
    expect(validateRequest({ ...request, target_duration_seconds: 601 })).toMatch(/10 and 600/);
    expect(validateRequest({ ...request, content_style: 'podcast' })).toMatch(/content_style/);
  });

  test('requires a supported audio quality', () => {
    expect(validateRequest({ ...request, audio_quality: 'studio' })).toMatch(/audio_quality/);
    expect(validateRequest({ ...request, audio_quality: undefined })).toMatch(/audio_quality/);
  });

  test('requires supported objective and tone controls', () => {
    expect(validateRequest({ ...request, content_objective: 'sales' })).toMatch(/content_objective/);
    expect(validateRequest({ ...request, tone: 'sensational' })).toMatch(/tone/);
  });

  test('requires scene briefs to align with scene identifiers', () => {
    expect(validateRequest({ ...request, scene_briefs: [] })).toMatch(/scene_briefs/);
    expect(validateRequest({
      ...request,
      scene_briefs: request.scene_briefs.map((brief, index) => index === 0
        ? { ...brief, scene_id: 'wrong-scene' }
        : brief),
    })).toMatch(/scene_briefs/);
  });
});
