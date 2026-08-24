import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { resetConfigCache } from "../src/core/config.js";
import { readJsonFile } from "../src/core/file-system.js";
import type { ProductionRunState, RenderPayload } from "../src/core/types.js";
import { runTopicProduction } from "../src/workflows/produce-topic.js";
import { MockLingRootCoreClient } from "../src/adapters/mock-lingroot-core-client.js";
import type { GetLevelPackageParams } from "../src/services/lingroot-core-client.js";

const originalDryRun = process.env.DRY_RUN;

afterEach(() => {
  if (originalDryRun === undefined) delete process.env.DRY_RUN;
  else process.env.DRY_RUN = originalDryRun;
  resetConfigCache();
});

describe("runTopicProduction", () => {
  it("creates a resumable review-ready package with one shared visual manifest", async () => {
    process.env.DRY_RUN = "true";
    resetConfigCache();
    const result = await runTopicProduction({
      topic: "How sleep supports memory",
      levels: ["A1", "A2"],
      sceneCount: 2,
      now: new Date("2026-07-14T09:00:00.000Z"),
      outputRoot: "outputs/.tmp-produce-topic-tests",
    });

    expect(result.runState.stage).toBe("review_ready");
    expect(result.qaReport.passed).toBe(true);
    expect(result.topicPackage.visualScenes.scenes).toHaveLength(2);
    expect(result.runState.levels.every((item) => item.status === "rendered")).toBe(true);

    const payloads = await Promise.all(
      ["A1", "A2"].map((level) =>
        readJsonFile<RenderPayload>(
          `${result.packageDir}/levels/${level}/render-payload.json`,
        ),
      ),
    );
    for (const payload of payloads) {
      expect(payload.visualScenes).toEqual(result.topicPackage.visualScenes);
      expect(payload.audio.ref).toBeNull();
      expect(payload.subtitle.ref).toBeNull();
    }

    const persisted = await readJsonFile<ProductionRunState>(
      `${result.packageDir}/run-state.json`,
    );
    expect(persisted.stage).toBe("review_ready");

    const resumed = await runTopicProduction({
      resumePackageDir: result.packageDir,
    });
    expect(resumed.runState.runId).toBe(result.runState.runId);
    expect(resumed.qaReport.passed).toBe(true);
  });

  it("defaults long-form production to seven minutes and high-quality audio", async () => {
    process.env.DRY_RUN = "true";
    resetConfigCache();
    const delegate = new MockLingRootCoreClient();
    let request: GetLevelPackageParams | undefined;
    const outputRoot = await mkdtemp(join(tmpdir(), "lingroot-long-form-test-"));
    try {
      const result = await runTopicProduction({
        topic: "Why songs get stuck in your head",
        levels: ["B1"],
        sceneCount: 12,
        productionFormat: "long",
        now: new Date("2026-07-17T09:00:00.000Z"),
        outputRoot,
        coreClient: {
          getLevelPackage: async (params) => {
            request = params;
            return delegate.getLevelPackage(params);
          },
        },
      });

      expect(request?.durationSeconds).toBe(420);
      expect(request?.audioQuality).toBe("high");
      expect(result.runState.targetDurationSeconds).toBe(420);
      expect(result.runState.videoWidth).toBe(1920);
      expect(result.runState.videoHeight).toBe(1080);
    } finally {
      await rm(outputRoot, { recursive: true, force: true });
    }
  });
});
