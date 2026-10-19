const MEDIA_PLATFORMS = ['youtube', 'instagram', 'x', 'tiktok'];
const MEDIA_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const MEDIA_OBJECTIVES = ['education', 'discovery', 'engagement', 'announcement'];
const MEDIA_TONES = ['educational', 'warm', 'professional', 'energetic'];
const MEDIA_VOICE_PROFILES = [
  'english_female', 'english_male', 'british_female', 'british_male',
  'openai_marin', 'openai_cedar',
];
const MEDIA_AUDIO_QUALITIES = ['standard', 'high'];
const YOUTUBE_LONG_DURATION_SECONDS = [300, 360, 420, 480, 540, 600];
const YOUTUBE_PRIVACY_STATUSES = ['private', 'public'];
const YOUTUBE_CATEGORY_IDS = [
  '1', '2', '10', '15', '17', '19', '20', '22', '23', '24', '25', '26', '27', '28', '29',
];
const MEDIA_FORMATS = {
  youtube: ['vertical_video', 'horizontal_video'],
  instagram: ['vertical_video'],
  x: ['vertical_video'],
  tiktok: ['vertical_video'],
};
const CAMPAIGN_STATUSES = [
  'draft', 'queued', 'planning', 'generating_visuals', 'generating_levels',
  'rendering', 'qa', 'quality_queued', 'quality_review', 'repair_required',
  'repairing', 'human_review', 'review_ready', 'approved', 'scheduled', 'published',
  'failed', 'cancelled',
];
const ACTIVE_JOB_STATUSES = ['queued', 'processing'];

module.exports = {
  MEDIA_PLATFORMS,
  MEDIA_LEVELS,
  MEDIA_OBJECTIVES,
  MEDIA_TONES,
  MEDIA_VOICE_PROFILES,
  MEDIA_AUDIO_QUALITIES,
  YOUTUBE_LONG_DURATION_SECONDS,
  YOUTUBE_PRIVACY_STATUSES,
  YOUTUBE_CATEGORY_IDS,
  MEDIA_FORMATS,
  CAMPAIGN_STATUSES,
  ACTIVE_JOB_STATUSES,
};
