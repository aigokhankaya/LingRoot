/**
 * Each mock/local adapter is exercised and its output asserted schema-valid
 * (where a schema exists) or functionally correct. No network is touched.
 */

import { describe, expect, it } from "vitest";

import {
  LocalStorageClient,
  MockImageClient,
  MockLingRootCoreClient,
  MockRenderClient,
} from "../src/adapters/index.js";
import { validate } from "../src/core/validators.js";
import { DEFAULT_LEVELS, buildRenderPayload } from "../src/testing/fixtures.js";
import type { CefrLevel } from "../src/core/types.js";
import { planVisualScenes } from "../src/services/visual-scene-planner.js";

const TOPIC_ID = "ordering-coffee";

describe("MockImageClient.generateImage", () => {
  it("returns schema-valid image bytes and provenance", async () => {
    const client = new MockImageClient();
    const generated = await client.generateImage({
      schemaVersion: 1,
      topicId: TOPIC_ID,
      sceneId: "scene-1",
      prompt: "A warm vertical cafe scene with no text.",
      size: "1024x1536",
      quality: "low",
      outputFormat: "png",
      moderation: "auto",
    });

    expect(validate("image-generation-result", generated.metadata).valid).toBe(
      true,
    );
    expect(generated.bytes.byteLength).toBeGreaterThan(8);
    expect(generated.metadata.provider).toBe("mock");
    expect(generated.metadata.sceneId).toBe("scene-1");
  });
});

describe("MockLingRootCoreClient.getLevelPackage", () => {
  const core = new MockLingRootCoreClient();
  const scenes = {
    schemaVersion: 1,
    topicId: TOPIC_ID,
    scenes: [
      { sceneId: "scene-1", order: 0, imagePrompt: "p1", imageRef: null, durationSeconds: 5 },
      { sceneId: "scene-2", order: 1, imagePrompt: "p2", imageRef: null, durationSeconds: 5 },
    ],
  };

  it.each(DEFAULT_LEVELS)("returns a schema-valid level-package for %s", async (level: CefrLevel) => {
    const pkg = await core.getLevelPackage({
      topicId: TOPIC_ID,
      coreMessage: "How to order coffee",
      level,
      durationSeconds: 18,
      visualScenes: scenes,
    });

    const result = validate("level-package", pkg);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(pkg.level).toBe(level);
    expect(pkg.audio.durationSeconds).toBe(18);
    // Script lines reference only sceneIds from the shared manifest.
    const manifestIds = new Set(scenes.scenes.map((s) => s.sceneId));
    for (const line of pkg.script.lines) expect(manifestIds.has(line.sceneId)).toBe(true);
  });
});

describe("MockRenderClient.render", () => {
  it("renders a single level from a schema-valid payload", async () => {
    const scenes = planVisualScenes({
      topicId: TOPIC_ID,
      topic: "Ordering coffee",
      sceneCount: 3,
    });
    const payload = buildRenderPayload("B1", scenes);

    // The payload itself must be schema-valid.
    expect(validate("render-payload", payload).valid).toBe(true);

    const render = new MockRenderClient();
    const result = await render.render(payload);

    expect(result.level).toBe("B1");
    expect(result.render_status).toBe("done");
    expect(result.local_video_path).toBeTruthy();
    expect(result.resolution).toBe("1080x1920");
    expect(result.duration_seconds).toBeGreaterThan(0);
  });
});

describe("LocalStorageClient", () => {
  it("stores and retrieves text round-trip", async () => {
    const storage = new LocalStorageClient();
    const key = "outputs/.tmp-adapters-test/hello.txt";
    const content = "same topic. your level.";

    const stored = await storage.store(key, content);
    expect(stored.path.endsWith("hello.txt")).toBe(true);
    expect(stored.bytes).toBe(new TextEncoder().encode(content).length);

    const back = await storage.retrieve(key);
    expect(back.toString("utf8")).toBe(content);
    await storage.remove(key);
  });
});
