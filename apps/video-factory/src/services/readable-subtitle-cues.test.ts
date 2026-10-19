import { describe, expect, it } from "vitest";

import { readableSubtitleCues } from "./readable-subtitle-cues.js";

describe("readableSubtitleCues", () => {
  it("merges a short trailing fragment into the previous cue", () => {
    const cues = readableSubtitleCues([
      { sceneId: "scene-01", text: "They repeat in your mind without stopping.", startMs: 0, endMs: 4200 },
    ]);

    expect(cues).toEqual([
      { sceneId: "scene-01", text: "They repeat in your mind without stopping.", startMs: 0, endMs: 4200 },
    ]);
  });

  it("does not merge cues across scene boundaries", () => {
    const cues = readableSubtitleCues([
      { sceneId: "scene-01", text: "Short.", startMs: 0, endMs: 500 },
      { sceneId: "scene-02", text: "A different scene starts here.", startMs: 500, endMs: 2500 },
    ]);

    expect(cues).toHaveLength(2);
    expect(cues[0]?.text).toBe("Short.");
  });

  it("is idempotent after captions have been made readable", () => {
    const initial = [
      { sceneId: "scene-01", text: "You can try listening to the full", startMs: 0, endMs: 2500 },
      { sceneId: "scene-01", text: "song.", startMs: 2500, endMs: 2850 },
    ];

    const once = readableSubtitleCues(initial);
    expect(readableSubtitleCues(once)).toEqual(once);
  });

  it("keeps closing quotation marks with the sentence they close", () => {
    const cues = readableSubtitleCues([
      {
        sceneId: "scene-01",
        text: "This is called an 'earworm.' It is common worldwide.",
        startMs: 0,
        endMs: 5000,
      },
    ]);

    expect(cues.map((cue) => cue.text)).toEqual([
      "This is called an 'earworm.'",
      "It is common worldwide.",
    ]);
  });

  it("repairs a closing quotation mark orphaned by a prior run", () => {
    const cues = readableSubtitleCues([
      { sceneId: "scene-01", text: "This is called an 'earworm.", startMs: 0, endMs: 2500 },
      { sceneId: "scene-01", text: "' It is common worldwide.", startMs: 2500, endMs: 5000 },
    ]);

    expect(cues.map((cue) => cue.text)).toEqual([
      "This is called an 'earworm.'",
      "It is common worldwide.",
    ]);
  });
});
