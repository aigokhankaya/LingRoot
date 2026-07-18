/**
 * Mock fixture builders for Phase 1 testing.
 *
 * These produce schema-valid objects deterministically (no randomness, no I/O)
 * so tests can assert structural invariants — most importantly that every CEFR
 * level reuses the topic's single shared image-manifest and carries no images
 * of its own.
 */

import type {
  CefrLevel,
  LevelPackage,
  RenderPayload,
  TopicPackage,
  VisualScenes,
} from "../core/types.js";

export const DEFAULT_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const LEVEL_LABELS: Record<CefrLevel, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper-Intermediate",
  C1: "Advanced",
  C2: "Proficiency",
};

/** Build the single shared image-manifest for a topic. */
export function buildVisualScenes(topicId: string, sceneCount = 3): VisualScenes {
  return {
    schemaVersion: 1,
    topicId,
    scenes: Array.from({ length: sceneCount }, (_, i) => ({
      sceneId: `scene-${i + 1}`,
      order: i,
      imagePrompt: `Mock prompt for scene ${i + 1} of ${topicId}`,
      imageRef: null,
      durationSeconds: 5,
    })),
  };
}

/**
 * Build a per-level package. Takes the shared manifest only to derive sceneIds —
 * the returned package carries NO images/scenes, only references by sceneId.
 */
export function buildLevelPackage(
  topicId: string,
  level: CefrLevel,
  visualScenes: VisualScenes,
): LevelPackage {
  let elapsedMs = 0;
  return {
    schemaVersion: 1,
    topicId,
    level,
    script: {
      lines: visualScenes.scenes.map((scene) => ({
        sceneId: scene.sceneId,
        text: `[${level}] line for ${scene.sceneId}`,
      })),
    },
    audio: { ref: null, voice: "mock-voice", durationSeconds: 15 },
    subtitle: {
      ref: null,
      format: "srt",
      cues: visualScenes.scenes.map((scene, i) => ({
        sceneId: scene.sceneId,
        text: `[${level}] subtitle for ${scene.sceneId}`,
        startMs: visualScenes.scenes
          .slice(0, i)
          .reduce((sum, item) => sum + Math.round(item.durationSeconds * 1000), 0),
        endMs: (elapsedMs += Math.round(scene.durationSeconds * 1000)),
      })),
    },
    levelBadge: { level, label: LEVEL_LABELS[level] },
    metadata: {
      title: `Mock Topic — ${level}`,
      description: `Mock description for ${level}.`,
      language: "en",
      tags: ["lingroot", level.toLowerCase()],
    },
  };
}

/**
 * Build a full topic package: exactly ONE shared visualScenes manifest plus one
 * level package per requested level. All levels reference the same manifest.
 */
export function buildTopicPackage(
  options: { topicId?: string; slug?: string; title?: string; levels?: CefrLevel[]; sceneCount?: number } = {},
): TopicPackage {
  const topicId = options.topicId ?? "ordering-coffee";
  const levels = options.levels ?? DEFAULT_LEVELS;
  const visualScenes = buildVisualScenes(topicId, options.sceneCount ?? 3);

  return {
    schemaVersion: 1,
    topicId,
    slug: options.slug ?? topicId,
    title: options.title ?? "Ordering Coffee at a Cafe",
    category: "daily-life",
    corePromise: "Same topic. Your level.",
    createdAt: "2026-06-21T09:00:00.000Z",
    visualScenes,
    levels: levels.map((level) => buildLevelPackage(topicId, level, visualScenes)),
  };
}

/**
 * Build a render payload for a single level by composing the shared manifest
 * with that level's per-level assets. The same `visualScenes` is reused for
 * every level — exactly what the render path must do.
 */
export function buildRenderPayload(
  level: CefrLevel,
  visualScenes: VisualScenes,
): RenderPayload {
  const durationSeconds = visualScenes.scenes.reduce((sum, s) => sum + s.durationSeconds, 0);
  return {
    schemaVersion: 1,
    topicId: visualScenes.topicId,
    level,
    visualScenes,
    audio: { ref: null, durationSeconds },
    subtitle: { ref: null, format: "srt" },
    levelBadge: { level, label: LEVEL_LABELS[level] },
    videoFormat: { width: 1080, height: 1920, fps: 30, durationSeconds },
    outputPath: null,
  };
}
