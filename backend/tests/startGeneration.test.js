/**
 * @jest-environment node
 */

jest.mock('../utils/storage/supabaseClient.js', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const { supabase } = require('../utils/storage/supabaseClient.js');
const {
  DEFAULT_PROGRESS,
  getNextStartGenerationType,
  normalizeStartGenerationProgress,
  validateStartGenerationRequest,
} = require('../utils/onboarding/startGeneration.js');

function createSettingsQuery(settings) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: settings == null ? null : { settings }, error: null }),
    upsert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { settings }, error: null }),
  };
  return chain;
}

describe('start generation onboarding helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('normalizes missing progress to defaults', () => {
    expect(normalizeStartGenerationProgress({})).toEqual(DEFAULT_PROGRESS);
  });

  test('derives count from completed flags', () => {
    const progress = normalizeStartGenerationProgress({
      start_generation_progress: {
        text_completed: true,
        podcast_completed: false,
        topic_completed: true,
        count: 99,
      },
    });

    expect(progress).toEqual({
      text_completed: true,
      podcast_completed: false,
      topic_completed: true,
      count: 2,
    });
  });

  test('returns first incomplete step as next type', () => {
    expect(getNextStartGenerationType(DEFAULT_PROGRESS)).toBe('text');
    expect(getNextStartGenerationType({
      text_completed: true,
      podcast_completed: false,
      topic_completed: false,
      count: 1,
    })).toBe('podcast');
  });

  test('allows any incomplete method at the beginning', async () => {
    supabase.from.mockReturnValue(createSettingsQuery({
      start_generation_progress: {
        text_completed: false,
        podcast_completed: false,
        topic_completed: false,
      },
    }));

    const result = await validateStartGenerationRequest('user-1', 'podcast');

    expect(result.allowed).toBe(true);
    expect(result.type).toBe('podcast');
  });

  test('allows topic request after prior steps complete', async () => {
    supabase.from.mockReturnValue(createSettingsQuery({
      start_generation_progress: {
        text_completed: true,
        podcast_completed: true,
        topic_completed: false,
      },
    }));

    const result = await validateStartGenerationRequest('user-1', 'topic');

    expect(result.allowed).toBe(true);
    expect(result.type).toBe('topic');
  });
});
