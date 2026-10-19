/**
 * Abstraction over the source of per-level content (script/audio/subtitle).
 *
 * The concrete implementation may later be a real HTTP API or a shared package;
 * the core pipeline depends ONLY on this interface, never on a concrete client.
 * Swapping API-vs-shared-package must touch the adapter alone.
 *
 * NOTE on the shared-visuals invariant: this client receives the topic's single
 * shared {@link VisualScenes} manifest and must align its script/subtitle output
 * to those `sceneId`s. It never creates or returns images.
 */

import type {
  CefrLevel,
  AudioQuality,
  LevelPackage,
  LingRootCoreApiRequest,
  VisualScenes,
  ProductionFormat,
} from "../core/types.js";

export interface GetLevelPackageParams {
  topicId: string;
  /** Human-readable topic. Falls back to coreMessage when omitted. */
  topic?: string;
  /** The core message / topic prompt to adapt for this level. */
  coreMessage: string;
  level: CefrLevel;
  /** Target spoken duration for this level, in seconds. */
  durationSeconds: number;
  /** The shared manifest; script/subtitle lines must reference its sceneIds. */
  visualScenes: VisualScenes;
  language?: string;
  voiceProfile?: string;
  audioQuality?: AudioQuality;
  productionFormat?: ProductionFormat;
  objective?: "education" | "discovery" | "engagement" | "announcement";
  tone?: "educational" | "warm" | "professional" | "energetic";
}

export interface LingRootCoreClient {
  getLevelPackage(params: GetLevelPackageParams): Promise<LevelPackage>;
}

export function buildLingRootCoreRequest(
  params: GetLevelPackageParams,
): LingRootCoreApiRequest {
  return {
    schema_version: 1,
    topic_id: params.topicId,
    topic: params.topic ?? params.coreMessage,
    core_message: params.coreMessage,
    target_level: params.level,
    target_duration_seconds: params.durationSeconds,
    language: params.language ?? "en",
    voice_profile: params.voiceProfile ?? "english_female",
    audio_quality: params.audioQuality ?? "standard",
    subtitle_format: "srt",
    content_style: params.productionFormat === "long"
      ? "long_form_listening_video"
      : "short_listening_video",
    content_objective: params.objective ?? "education",
    tone: params.tone ?? "educational",
    brand: "LingRoot",
    scene_ids: params.visualScenes.scenes.map((scene) => scene.sceneId),
    scene_briefs: params.visualScenes.scenes.map((scene) => ({
      scene_id: scene.sceneId,
      narrative_beat: scene.narrativeBeat ?? scene.altText ?? scene.imagePrompt,
    })),
  };
}
