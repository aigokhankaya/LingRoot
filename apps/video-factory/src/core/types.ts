/**
 * TypeScript contracts mirroring the JSON Schemas in `schemas/`.
 *
 * CRITICAL INVARIANT (enforced structurally in the schemas):
 * A {@link TopicPackage} holds exactly ONE shared {@link VisualScenes} manifest.
 * {@link LevelPackage} carries NO images and NO scenes of its own — it only
 * references scenes by `sceneId`. Therefore every level reuses the same visuals
 * and scene order. Only script/audio/subtitle/badge/metadata vary per level.
 */

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type SubtitleFormat = "srt" | "vtt" | "ass";

export type PublishMode = "review" | "private_upload" | "auto_public";
export type ProductionFormat = "short" | "long";
export type AudioQuality = "standard" | "high";

export type GenerationMode =
  | "dry-run"
  | "test-single-level"
  | "test-six-levels"
  | "production";

export type ImageOutputFormat = "png" | "jpeg" | "webp";
export type ImageQuality = "low" | "medium" | "high" | "auto";

export interface ImageGenerationRequest {
  schemaVersion: 1;
  topicId: string;
  sceneId: string;
  prompt: string;
  size: string;
  quality: ImageQuality;
  outputFormat: ImageOutputFormat;
  moderation: "auto";
}

export interface ImageGenerationMetadata {
  schemaVersion: 1;
  topicId: string;
  sceneId: string;
  provider: string;
  model: string;
  requestId?: string | null;
  createdAt: string;
  contentType: "image/png" | "image/jpeg" | "image/webp";
  extension: "png" | "jpg" | "webp";
  bytes: number;
  size: string;
  quality: ImageQuality;
  moderation: "auto";
}

// ---------------------------------------------------------------------------
// Topic source — owned by LingRoot and consumed once per production run.
// ---------------------------------------------------------------------------

export interface TopicVisualOutlineItem {
  sceneId: string;
  order: number;
  narrativeBeat: string;
  altText: string;
}

export interface TopicBrief {
  schemaVersion: 1;
  topicId: string;
  title: string;
  coreMessage: string;
  category: string;
  language: string;
  visualOutline: TopicVisualOutlineItem[];
}

// ---------------------------------------------------------------------------
// Shared image-manifest (visual-scenes.schema.json) — the single source of truth.
// ---------------------------------------------------------------------------

export interface Scene {
  sceneId: string;
  order: number;
  imagePrompt: string;
  imageRef?: string | null;
  /** Canonical non-secret storage reference, never a signed render URL. */
  storageRef?: string | null;
  /** SHA-256 of the local generated image bytes. */
  imageHash?: string;
  /** Level-independent semantic direction supplied by the topic brief. */
  narrativeBeat?: string;
  durationSeconds: number;
  altText?: string;
  imageProvenance?: ImageGenerationMetadata;
}

export interface VisualScenes {
  schemaVersion?: number;
  topicId: string;
  scenes: Scene[];
}

// ---------------------------------------------------------------------------
// Per-level package (level-package.schema.json) — NO images here by design.
// ---------------------------------------------------------------------------

export interface ScriptLine {
  /** References a scene in the shared {@link VisualScenes} manifest. */
  sceneId: string;
  text: string;
}

export interface SubtitleCue {
  sceneId: string;
  text: string;
  startMs: number;
  endMs: number;
}

/** Timing is level-specific while visual assets and scene order stay shared. */
export interface LevelTimeline {
  scenes: Array<{ sceneId: string; startMs: number; endMs: number }>;
  durationSeconds: number;
}

export interface LevelPackage {
  schemaVersion?: number;
  topicId: string;
  level: CefrLevel;
  script: { lines: ScriptLine[] };
  audio: {
    ref?: string | null;
    voice: string;
    durationSeconds: number;
    speakingRate?: number;
  };
  subtitle: { ref?: string | null; format: SubtitleFormat; cues: SubtitleCue[] };
  timeline?: LevelTimeline;
  levelBadge: { level: CefrLevel; label: string };
  metadata: {
    title: string;
    description: string;
    language: string;
    tags: string[];
  };
}

// ---------------------------------------------------------------------------
// Topic package (topic-package.schema.json) — one manifest + many levels.
// ---------------------------------------------------------------------------

export interface TopicPackage {
  schemaVersion?: number;
  topicId: string;
  slug: string;
  title: string;
  category?: string;
  corePromise?: "Same topic. Your level.";
  createdAt?: string;
  /** The single shared manifest reused by every level. */
  visualScenes: VisualScenes;
  levels: LevelPackage[];
}

// ---------------------------------------------------------------------------
// Render payload (render-payload.schema.json).
// ---------------------------------------------------------------------------

export interface RenderPayload {
  schemaVersion?: number;
  topicId: string;
  level: CefrLevel;
  /** Shared manifest — identical for every level of this topic. */
  visualScenes: VisualScenes;
  audio: { ref: string | null; durationSeconds?: number };
  subtitle: { ref: string | null; format: SubtitleFormat };
  timeline?: LevelTimeline;
  levelBadge: { level: CefrLevel; label: string };
  videoFormat: { width: number; height: number; fps: number; durationSeconds?: number };
  outputPath?: string | null;
}

export type Json2VideoRenderStatus =
  | "pending"
  | "running"
  | "done"
  | "error"
  | "timeout";

export interface Json2VideoMovieRequest {
  resolution: "custom";
  width: number;
  height: number;
  quality: "low" | "medium" | "high";
  cache: boolean;
  comment: string;
  "client-data": {
    topicId: string;
    level: CefrLevel;
    sceneIds: string[];
  };
  scenes: Array<{
    comment: string;
    duration: number;
    elements: Array<{
      type: "image";
      src: string;
      duration: -2;
      resize: "cover";
      cache: true;
    }>;
  }>;
  elements: Array<
    | {
        type: "audio";
        src: string;
        duration: -2;
        cache: true;
      }
    | {
        type: "subtitles";
        captions: string;
        language: "en";
      }
    | {
        type: "text";
        text: CefrLevel;
        duration: -2;
        position: "custom";
        x: number;
        y: number;
        width: number;
      }
  >;
}

export interface Json2VideoSubmitResponse {
  success: true;
  project: string;
  timestamp: string;
}

export interface Json2VideoStatusResponse {
  success: true;
  movie: {
    success?: boolean;
    status: Json2VideoRenderStatus;
    message?: string;
    project: string;
    url?: string | null;
    ass?: string | null;
    created_at?: string;
    ended_at?: string;
    duration?: number;
    size?: number;
    width?: number;
    height?: number;
    rendering_time?: number;
    progress?: number;
  };
}

export interface IntegrationCheckReport {
  schemaVersion: 1;
  runId: string;
  topicId: string;
  levels: CefrLevel[];
  sceneCount: number;
  storageObjects: string[];
  renders: Array<{
    level: CefrLevel;
    provider?: string | null;
    projectId?: string | null;
    localVideoPath?: string | null;
    durationSeconds: number;
    resolution: string;
    bytes?: number | null;
    renderingTimeSeconds?: number | null;
  }>;
  secretsPersisted: false;
}

// ---------------------------------------------------------------------------
// Platform metadata.
// ---------------------------------------------------------------------------

export type YouTubePrivacy = "private" | "unlisted" | "public";

export interface YouTubeMetadata {
  schemaVersion?: number;
  level?: CefrLevel;
  title: string;
  description: string;
  tags: string[];
  categoryId?: string;
  privacyStatus: YouTubePrivacy;
  madeForKids?: boolean;
  isShort?: boolean;
}

export interface InstagramMetadata {
  schemaVersion?: number;
  level?: CefrLevel;
  caption: string;
  hashtags?: string[];
  shareToFeed?: boolean;
  coverImageRef?: string | null;
}

// ---------------------------------------------------------------------------
// Reports (qa-report.schema.json, production-report.schema.json).
// ---------------------------------------------------------------------------

export type CheckSeverity = "info" | "warn" | "error";

export interface QaCheck {
  id: string;
  level?: CefrLevel | null;
  severity: CheckSeverity;
  passed: boolean;
  message: string;
}

export interface QaReport {
  schemaVersion?: number;
  topicId: string;
  runId?: string;
  generatedAt: string;
  passed: boolean;
  score?: number;
  checks: QaCheck[];
  summary?: { errors?: number; warnings?: number };
}

// Agent results are advisory. Application policy owns state transitions.
export type QualityAgentType = "content" | "visual" | "av_sync" | "platform" | "supervisor";
export type QualityScope = "package" | "level" | "scene" | "platform";
export type QualitySeverity = "info" | "low" | "medium" | "high" | "critical";
export type QualityRecommendation = "accept" | "human_review" | "repair_required" | "blocked";
export type QualitySuggestedAction =
  | "none"
  | "regenerate_image"
  | "rewrite_script"
  | "regenerate_tts"
  | "retime_subtitles"
  | "rerender_video"
  | "rewrite_metadata"
  | "request_human_review";

export interface QualityFinding {
  severity: QualitySeverity;
  category: string;
  scope: QualityScope;
  level: CefrLevel | null;
  sceneId: string | null;
  platform: "youtube" | "instagram" | "x" | "tiktok" | null;
  artifactUri: string | null;
  evidence: string;
  suggestedAction: QualitySuggestedAction;
  autoFixable: boolean;
}

export interface QualityUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface QualityAssessment {
  schemaVersion: 1;
  agentType: QualityAgentType;
  scope: QualityScope;
  level?: CefrLevel | null;
  sceneId?: string | null;
  platform?: "youtube" | "instagram" | "x" | "tiktok" | null;
  score: number;
  confidence: number;
  summary: string;
  dimensionScores: Record<string, number>;
  findings: QualityFinding[];
  provider: string;
  model: string;
  promptVersion: string;
  usage: QualityUsage;
}

export interface QualityReport {
  schemaVersion: 1;
  topicId: string;
  qualityRunId: string;
  generatedAt: string;
  mode: "shadow" | "enforced";
  rubricVersion: string;
  overallScore: number;
  recommendation: QualityRecommendation;
  summary: string;
  dimensionScores: Record<string, number>;
  assessments: QualityAssessment[];
  hardGatePassed: boolean;
}

export type LevelRunStatus =
  | "pending"
  | "rendered"
  | "published"
  | "failed"
  | "skipped";

export interface ProductionLevelResult {
  level: CefrLevel;
  status: LevelRunStatus;
  videoRef?: string | null;
  youtubeVideoId?: string | null;
  instagramMediaId?: string | null;
}

export interface ProductionError {
  code?: string;
  message: string;
  level?: CefrLevel | null;
}

export interface ProductionReport {
  schemaVersion?: number;
  runId: string;
  topicId: string;
  startedAt: string;
  finishedAt?: string | null;
  dryRun: boolean;
  publishMode: PublishMode;
  status: "pending" | "running" | "succeeded" | "failed";
  qaReportRef?: string | null;
  levels: ProductionLevelResult[];
  errors?: ProductionError[];
}

// ---------------------------------------------------------------------------
// Durable production-run state. It intentionally excludes credentials and
// signed URLs so a package can be resumed without persisting bearer tokens.
// ---------------------------------------------------------------------------

export type ProductionRunStage =
  | "created"
  | "visuals_ready"
  | "levels_ready"
  | "rendered"
  | "review_ready"
  | "review_approved"
  | "released"
  | "failed";

export interface ProductionRunLevelState {
  level: CefrLevel;
  status: "pending" | "core_ready" | "render_submitted" | "rendered" | "released" | "failed";
  audioStorageKey?: string;
  subtitleStorageKey?: string;
  renderProjectId?: string;
  videoPath?: string;
  youtubeVideoId?: string;
  error?: string;
}

export interface ProductionRunState {
  schemaVersion: 1;
  runId: string;
  stage: ProductionRunStage;
  dryRun: boolean;
  packageDir: string;
  createdAt: string;
  updatedAt: string;
  topicBrief: TopicBrief;
  productionFormat?: ProductionFormat;
  targetDurationSeconds?: number;
  videoWidth?: number;
  videoHeight?: number;
  imageStorageKeys: Array<{ sceneId: string; key: string }>;
  levels: ProductionRunLevelState[];
  qaPassed?: boolean;
  reviewApprovedAt?: string;
  topicPlaylistId?: string;
  levelPlaylistIds?: Partial<Record<CefrLevel, string>>;
  errors: ProductionError[];
}

// ---------------------------------------------------------------------------
// LingRoot Core API contract.
// ---------------------------------------------------------------------------

export interface LingRootCoreApiRequest {
  schema_version: 1;
  topic_id: string;
  topic: string;
  core_message: string;
  target_level: CefrLevel;
  target_duration_seconds: number;
  language: string;
  voice_profile: string;
  audio_quality: AudioQuality;
  subtitle_format: "srt";
  content_style: "short_listening_video" | "long_form_listening_video";
  content_objective: "education" | "discovery" | "engagement" | "announcement";
  tone: "educational" | "warm" | "professional" | "energetic";
  brand: "LingRoot";
  scene_ids: string[];
  scene_briefs: Array<{ scene_id: string; narrative_beat: string }>;
}

export interface LingRootCoreApiScriptLine {
  scene_id: string;
  text: string;
}

export interface LingRootCoreApiSubtitleLine {
  scene_id: string;
  start: number;
  end: number;
  text: string;
}

export interface LingRootCoreApiResponse {
  schema_version: 1;
  topic_id: string;
  level: CefrLevel;
  voiceover_script: string;
  script_lines: LingRootCoreApiScriptLine[];
  audio_url: string;
  subtitle_url: string;
  subtitle_lines: LingRootCoreApiSubtitleLine[];
  duration_seconds: number;
  voice_profile: string;
  speaking_rate: number;
}

/** Map from schema name (without extension) to its TypeScript contract. */
export interface SchemaTypeMap {
  "topic-package": TopicPackage;
  "visual-scenes": VisualScenes;
  "level-package": LevelPackage;
  "render-payload": RenderPayload;
  "youtube-metadata": YouTubeMetadata;
  "instagram-metadata": InstagramMetadata;
  "qa-report": QaReport;
  "production-report": ProductionReport;
  "lingroot-core-request": LingRootCoreApiRequest;
  "lingroot-core-response": LingRootCoreApiResponse;
  "image-generation-request": ImageGenerationRequest;
  "image-generation-result": ImageGenerationMetadata;
  "json2video-movie-request": Json2VideoMovieRequest;
  "json2video-submit-response": Json2VideoSubmitResponse;
  "json2video-status-response": Json2VideoStatusResponse;
  "integration-check-report": IntegrationCheckReport;
  "topic-brief": TopicBrief;
  "production-run-state": ProductionRunState;
  "quality-finding": QualityFinding;
  "quality-assessment": QualityAssessment;
  "quality-report": QualityReport;
}

export type SchemaName = keyof SchemaTypeMap;
