import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetConfigCache } from "../src/core/config.js";
import { readJsonFile } from "../src/core/file-system.js";
import type { RenderPayload, TopicPackage } from "../src/core/types.js";
import { runPackageQa } from "../src/qa/package-qa.js";
import { runProduction } from "../src/workflows/generate-topic-package.js";
import { DEFAULT_LEVELS } from "../src/testing/fixtures.js";
import { MockImageClient } from "../src/adapters/mock-image-client.js";

const originalDryRun = process.env.DRY_RUN;

beforeEach(() => {
  process.env.DRY_RUN = "true";
  resetConfigCache();
});

afterEach(() => {
  if (originalDryRun === undefined) delete process.env.DRY_RUN;
  else process.env.DRY_RUN = originalDryRun;
  resetConfigCache();
});

describe("Phase 1 production workflow", () => {
  it("generates a complete six-level package with one shared manifest", async () => {
    const result = await runProduction({
      topic: "How habits shape learning",
      mode: "test-six-levels",
      now: new Date("2026-06-21T09:00:00.000Z"),
      outputRoot: "outputs/.tmp-workflow-tests",
    });

    expect(result.qaReport.passed).toBe(true);
    expect(result.productionReport.status).toBe("succeeded");
    expect(result.topicPackage.levels.map((item) => item.level)).toEqual(
      DEFAULT_LEVELS,
    );

    const payloads = await Promise.all(
      DEFAULT_LEVELS.map((level) =>
        readJsonFile<RenderPayload>(
          `${result.packageDir}/levels/${level}/render-payload.json`,
        ),
      ),
    );
    for (const payload of payloads) {
      expect(payload.visualScenes).toEqual(result.topicPackage.visualScenes);
    }
  });

  it("fails semantic QA when a level references an unknown scene", async () => {
    const result = await runProduction({
      topic: "Why sleep helps memory",
      mode: "test-single-level",
      levels: ["A1"],
      now: new Date("2026-06-21T10:00:00.000Z"),
      outputRoot: "outputs/.tmp-workflow-tests",
    });
    const tampered = structuredClone(result.topicPackage) as TopicPackage;
    tampered.levels[0].script.lines[0].sceneId = "unknown-scene";

    const report = await runPackageQa({
      packageDir: result.packageDir,
      topicPackage: tampered,
      expectedLevels: ["A1"],
    });

    expect(report.passed).toBe(false);
    expect(
      report.checks.some(
        (item) => item.id === "script-scene-refs" && !item.passed,
      ),
    ).toBe(true);
  });

  it("generates each shared scene image once, not once per level", async () => {
    const delegate = new MockImageClient();
    let imageCalls = 0;
    const result = await runProduction({
      topic: "Why repetition strengthens memory",
      mode: "test-six-levels",
      sceneCount: 2,
      now: new Date("2026-06-21T11:00:00.000Z"),
      outputRoot: "outputs/.tmp-workflow-tests",
      imageClient: {
        generateImage: async (request) => {
          imageCalls += 1;
          return delegate.generateImage(request);
        },
      },
    });

    expect(result.topicPackage.levels).toHaveLength(6);
    expect(result.topicPackage.visualScenes.scenes).toHaveLength(2);
    expect(imageCalls).toBe(2);
    expect(
      result.topicPackage.visualScenes.scenes.every(
        (scene) => scene.imageProvenance?.provider === "mock",
      ),
    ).toBe(true);
  });
});
