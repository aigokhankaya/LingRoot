import { describe, expect, it } from "vitest";

import { buildYouTubeMetadata, withYouTubeLevelLinks } from "./social-metadata.js";

describe("buildYouTubeMetadata", () => {
  it("applies reviewed admin metadata while preserving level discovery fields", () => {
    const metadata = buildYouTubeMetadata("Alcatraz Escape", "B2", "long", {
      title: "The Alcatraz Escape",
      description: "A factual account adapted for English learners.",
      tags: ["history", "#Alcatraz"],
      categoryId: "27",
      madeForKids: false,
      cta: "Practice the vocabulary in LingRoot.",
    });

    expect(metadata.title).toBe("The Alcatraz Escape | B2 English Listening");
    expect(metadata.description).toContain("Practice the vocabulary in LingRoot.");
    expect(metadata.tags).toEqual(expect.arrayContaining(["history", "Alcatraz", "CEFR B2"]));
    expect(metadata.categoryId).toBe("27");
    expect(metadata.madeForKids).toBe(false);
  });
});

describe("withYouTubeLevelLinks", () => {
  it("preserves reviewed copy while appending level and playlist links", () => {
    const result = withYouTubeLevelLinks({
      schemaVersion: 1,
      level: "A1",
      title: "Why Songs Get Stuck | A1 English",
      description: "Reviewed topic copy.\n\nSource: https://example.com/research",
      tags: ["English listening"],
      privacyStatus: "private",
    }, { A1: "video-a1", C2: "video-c2" }, "playlist-all");

    expect(result.description).toContain("Reviewed topic copy.");
    expect(result.description).toContain("Source: https://example.com/research");
    expect(result.description).toContain("A1: https://youtu.be/video-a1");
    expect(result.description).toContain("C2: https://youtu.be/video-c2");
    expect(result.description).toContain("All levels: https://www.youtube.com/playlist?list=playlist-all");
  });
});
