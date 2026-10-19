import { describe, expect, it } from "vitest";

import type { RenderPayload } from "../src/core/types.js";
import { buildJson2VideoMovie } from "../src/services/json2video-movie-builder.js";
import { planVisualScenes } from "../src/services/visual-scene-planner.js";

function payload(): RenderPayload {
  const scenes = planVisualScenes({
    topicId: "memory-topic",
    topic: "Why sleep helps memory",
    sceneCount: 2,
  });
  scenes.scenes[0].imageRef = "https://assets.example.com/scene-1.png";
  scenes.scenes[1].imageRef = "https://assets.example.com/scene-2.png";
  return {
    schemaVersion: 1,
    topicId: "memory-topic",
    level: "B1",
    visualScenes: scenes,
    audio: {
      ref: "https://assets.example.com/audio.mp3",
      durationSeconds: 10,
    },
    subtitle: {
      ref: "https://assets.example.com/subtitles.srt",
      format: "srt",
    },
    levelBadge: { level: "B1", label: "Intermediate" },
    videoFormat: {
      width: 1080,
      height: 1920,
      fps: 30,
      durationSeconds: 10,
    },
    outputPath: "outputs/test/video.mp4",
  };
}

describe("buildJson2VideoMovie", () => {
  it("preserves shared scene order and composes global audio/subtitles/badge", () => {
    const movie = buildJson2VideoMovie(payload(), "medium");

    expect(movie.resolution).toBe("custom");
    expect([movie.width, movie.height]).toEqual([1080, 1920]);
    expect(movie["client-data"].sceneIds).toEqual(["scene-1", "scene-2"]);
    expect(movie.scenes.map((scene) => scene.elements[0].src)).toEqual([
      "https://assets.example.com/scene-1.png",
      "https://assets.example.com/scene-2.png",
    ]);
    expect(movie.elements.map((element) => element.type)).toEqual([
      "audio",
      "subtitles",
      "text",
    ]);
  });

  it("rejects local asset paths", () => {
    const invalid = payload();
    invalid.visualScenes.scenes[0].imageRef =
      "outputs/topic/common/scene-1.png";

    expect(() => buildJson2VideoMovie(invalid)).toThrow(
      "must be an HTTP(S) URL",
    );
  });

  it("preserves horizontal YouTube dimensions", () => {
    const horizontal = payload();
    horizontal.videoFormat = {
      width: 1920,
      height: 1080,
      fps: 30,
      durationSeconds: 330,
    };

    const movie = buildJson2VideoMovie(horizontal);

    expect([movie.width, movie.height]).toEqual([1920, 1080]);
  });
});
