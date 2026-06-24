const { supabase } = require('../storage/supabaseClient.js');

const START_GENERATION_KEY = 'start_generation_progress';
const START_GENERATION_ORDER = ['podcast', 'topic', 'text'];
const TOPIC_TYPES = new Set(['topic', 'subject']);

const DEFAULT_PROGRESS = Object.freeze({
  text_completed: false,
  podcast_completed: false,
  topic_completed: false,
  count: 0,
});

function normalizeStartGenerationProgress(settings) {
  const progress = settings && typeof settings === 'object'
    ? settings[START_GENERATION_KEY]
    : null;

  const normalized = {
    text_completed: Boolean(progress?.text_completed),
    podcast_completed: Boolean(progress?.podcast_completed),
    topic_completed: Boolean(progress?.topic_completed),
    count: 0,
  };

  normalized.count = [
    normalized.text_completed,
    normalized.podcast_completed,
    normalized.topic_completed,
  ].filter(Boolean).length;

  return normalized;
}

function withStartGenerationProgress(settings, progress) {
  return {
    ...(settings && typeof settings === 'object' ? settings : {}),
    [START_GENERATION_KEY]: normalizeStartGenerationProgress({
      [START_GENERATION_KEY]: progress,
    }),
  };
}

function getNextStartGenerationType(progress) {
  const normalized = normalizeStartGenerationProgress({
    [START_GENERATION_KEY]: progress,
  });

  return START_GENERATION_ORDER.find((type) => {
    if (type === 'text') return !normalized.text_completed;
    if (type === 'podcast') return !normalized.podcast_completed;
    return !normalized.topic_completed;
  }) || null;
}

async function getStartGenerationState(userId) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const settings = data?.settings && typeof data.settings === 'string'
    ? JSON.parse(data.settings)
    : (data?.settings || {});
  const progress = normalizeStartGenerationProgress(settings);
  const normalizedSettings = withStartGenerationProgress(settings, progress);
  const needsPersist = JSON.stringify(normalizedSettings) !== JSON.stringify(settings || {});

  if (needsPersist) {
    const { data: upsertData, error: upsertError } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, settings: normalizedSettings }, { onConflict: 'user_id' })
      .select('settings')
      .single();

    if (upsertError) {
      throw upsertError;
    }

    return {
      settings: upsertData?.settings || normalizedSettings,
      progress: normalizeStartGenerationProgress(upsertData?.settings || normalizedSettings),
    };
  }

  return { settings: normalizedSettings, progress };
}

function normalizeRequestedType(type) {
  if (!type || typeof type !== 'string') {
    return null;
  }

  const normalized = type.trim().toLowerCase();
  if (normalized === 'text') return 'text';
  if (normalized === 'podcast') return 'podcast';
  if (TOPIC_TYPES.has(normalized)) return 'topic';
  return null;
}

async function validateStartGenerationRequest(userId, requestedType) {
  const type = normalizeRequestedType(requestedType);
  if (!type) {
    return {
      allowed: false,
      code: 'INVALID_START_GENERATION_TYPE',
      message: 'Invalid start generation type.',
    };
  }

  const { progress } = await getStartGenerationState(userId);
  const nextType = getNextStartGenerationType(progress);

  if (!nextType) {
    return {
      allowed: false,
      code: 'START_GENERATION_COMPLETED',
      message: 'Start onboarding is already completed.',
      progress,
      nextType: null,
    };
  }

  const alreadyCompleted =
    (type === 'text' && progress.text_completed) ||
    (type === 'podcast' && progress.podcast_completed) ||
    (type === 'topic' && progress.topic_completed);

  if (alreadyCompleted) {
    return {
      allowed: false,
      code: 'START_GENERATION_ALREADY_COMPLETED',
      message: 'This start generation step is already completed.',
      progress,
      nextType,
    };
  }

  return { allowed: true, type, progress, nextType };
}

async function markStartGenerationCompleted(userId, completedType) {
  const type = normalizeRequestedType(completedType);
  if (!type) {
    throw new Error('Invalid start generation type');
  }

  const { settings, progress } = await getStartGenerationState(userId);
  const nextProgress = { ...progress };

  if (type === 'text') nextProgress.text_completed = true;
  if (type === 'podcast') nextProgress.podcast_completed = true;
  if (type === 'topic') nextProgress.topic_completed = true;
  nextProgress.count = [
    nextProgress.text_completed,
    nextProgress.podcast_completed,
    nextProgress.topic_completed,
  ].filter(Boolean).length;

  const nextSettings = withStartGenerationProgress(settings, nextProgress);

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, settings: nextSettings }, { onConflict: 'user_id' })
    .select('settings')
    .single();

  if (error) {
    throw error;
  }

  return normalizeStartGenerationProgress(data?.settings || nextSettings);
}

module.exports = {
  DEFAULT_PROGRESS,
  START_GENERATION_KEY,
  START_GENERATION_ORDER,
  getNextStartGenerationType,
  getStartGenerationState,
  markStartGenerationCompleted,
  normalizeRequestedType,
  normalizeStartGenerationProgress,
  validateStartGenerationRequest,
  withStartGenerationProgress,
};
