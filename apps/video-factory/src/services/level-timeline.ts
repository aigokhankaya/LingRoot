import { ExternalServiceError } from "../core/errors.js";
import type { LevelTimeline, SubtitleCue, VisualScenes } from "../core/types.js";

/**
 * Turns Core subtitle timing into a full visual timeline. The first/last scene
 * absorb any small lead-in or tail so the visual sequence spans the full audio.
 */
export function buildLevelTimeline(
  visualScenes: VisualScenes,
  cues: SubtitleCue[],
  durationSeconds: number,
): LevelTimeline {
  const sceneIds = visualScenes.scenes.map((scene) => scene.sceneId);
  const starts = new Map<string, number>();
  const scenePosition = new Map(sceneIds.map((sceneId, index) => [sceneId, index]));
  let previousPosition = -1;
  let previousEnd = 0;

  for (const cue of cues) {
    const position = scenePosition.get(cue.sceneId);
    if (position === undefined) {
      throw new ExternalServiceError(
        `Subtitle timeline references unknown scene "${cue.sceneId}".`,
      );
    }
    if (position < previousPosition) {
      throw new ExternalServiceError(
        "Subtitle timeline must follow the shared scene order.",
      );
    }
    if (cue.startMs + 250 < previousEnd) {
      throw new ExternalServiceError(
        "Subtitle timeline contains overlapping cues.",
      );
    }
    if (!starts.has(cue.sceneId)) starts.set(cue.sceneId, cue.startMs);
    previousPosition = position;
    previousEnd = Math.max(previousEnd, cue.endMs);
  }

  const durationMs = Math.round(durationSeconds * 1000);
  const scenes = sceneIds.map((sceneId, index) => {
    const nextSceneId = sceneIds[index + 1];
    const startMs = index === 0 ? 0 : starts.get(sceneId);
    const endMs =
      index === sceneIds.length - 1
        ? durationMs
        : starts.get(nextSceneId);
    if (startMs === undefined || endMs === undefined || endMs <= startMs) {
      throw new ExternalServiceError(
        "Subtitle timeline must provide a positive contiguous duration for every scene.",
      );
    }
    return { sceneId, startMs, endMs };
  });

  return { scenes, durationSeconds };
}
