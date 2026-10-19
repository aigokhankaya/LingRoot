import { describe, expect, it } from "vitest";

import { readableSubtitleCues } from "../src/services/readable-subtitle-cues.js";

describe("readableSubtitleCues", () => {
  it("splits long scene cues and merges unreadably short trailing fragments", () => {
    const result = readableSubtitleCues([
      {
        sceneId: "scene-01",
        text: "Istanbul has seven historic hills. They shaped the old city over many centuries.",
        startMs: 1000,
        endMs: 9000,
      },
    ]);

    expect(result.length).toBeGreaterThan(1);
    expect(result[0]?.startMs).toBe(1000);
    expect(result.at(-1)?.endMs).toBe(9000);
    expect(result.every((cue) => cue.sceneId === "scene-01")).toBe(true);
    expect(result.every((cue) => cue.text.split(/\s+/).length <= 11)).toBe(true);
    expect(result.every((cue) => cue.endMs - cue.startMs >= 1200)).toBe(true);
    expect(result.every((cue, index) => index === 0 || cue.startMs === result[index - 1]?.endMs)).toBe(true);
  });
});
