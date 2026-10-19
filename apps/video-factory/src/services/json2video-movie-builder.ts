import { ExternalServiceError } from "../core/errors.js";
import type {
  Json2VideoMovieRequest,
  RenderPayload,
} from "../core/types.js";
import { assertValid } from "../core/validators.js";

function requireHttpUrl(value: string | null, label: string): string {
  if (!value) {
    throw new ExternalServiceError(`${label} URL is required for JSON2Video.`);
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ExternalServiceError(
      `${label} must be an HTTP(S) URL accessible by JSON2Video.`,
    );
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new ExternalServiceError(
      `${label} must be an HTTP(S) URL accessible by JSON2Video.`,
    );
  }
  return value;
}

export function buildJson2VideoMovie(
  payloadInput: RenderPayload,
  quality: Json2VideoMovieRequest["quality"] = "high",
): Json2VideoMovieRequest {
  const payload = assertValid("render-payload", payloadInput);
  const orderedScenes = [...payload.visualScenes.scenes].sort(
    (left, right) => left.order - right.order,
  );
  if (
    orderedScenes.some((scene, index) => scene.order !== index) ||
    new Set(orderedScenes.map((scene) => scene.sceneId)).size !==
      orderedScenes.length
  ) {
    throw new ExternalServiceError(
      "Render visual scenes must have unique contiguous order.",
    );
  }
  const timelineBySceneId = new Map(
    payload.timeline?.scenes.map((scene) => [
      scene.sceneId,
      (scene.endMs - scene.startMs) / 1000,
    ]) ?? [],
  );
  if (
    payload.timeline &&
    (payload.timeline.scenes.length !== orderedScenes.length ||
      payload.timeline.scenes.some(
        (scene, index) => scene.sceneId !== orderedScenes[index]?.sceneId,
      ))
  ) {
    throw new ExternalServiceError(
      "Render timeline must reference the shared scene order exactly.",
    );
  }

  const request: Json2VideoMovieRequest = {
    resolution: "custom",
    width: payload.videoFormat.width,
    height: payload.videoFormat.height,
    quality,
    cache: true,
    comment: `LingRoot ${payload.topicId} ${payload.level}`,
    "client-data": {
      topicId: payload.topicId,
      level: payload.level,
      sceneIds: orderedScenes.map((scene) => scene.sceneId),
    },
    scenes: orderedScenes.map((scene) => ({
      comment: scene.sceneId,
      duration: timelineBySceneId.get(scene.sceneId) ?? scene.durationSeconds,
      elements: [
        {
          type: "image",
          src: requireHttpUrl(scene.imageRef ?? null, `${scene.sceneId} image`),
          duration: -2,
          resize: "cover",
          cache: true,
        },
      ],
    })),
    elements: [
      {
        type: "audio",
        src: requireHttpUrl(payload.audio.ref, "Audio"),
        duration: -2,
        cache: true,
      },
      {
        type: "subtitles",
        captions: requireHttpUrl(payload.subtitle.ref, "Subtitle"),
        language: "en",
      },
      {
        type: "text",
        text: payload.level,
        duration: -2,
        position: "custom",
        x: Math.max(48, payload.videoFormat.width - 200),
        y: 48,
        width: 140,
      },
    ],
  };
  return assertValid("json2video-movie-request", request);
}
