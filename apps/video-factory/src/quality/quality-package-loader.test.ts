import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadQualityPackage } from "./quality-package-loader.js";

const temporaryDirectories: string[] = [];

async function json(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8");
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("loadQualityPackage", () => {
  it("loads generated batches and all campaign target metadata", async () => {
    const packageDir = await mkdtemp(join(tmpdir(), "lingroot-quality-"));
    temporaryDirectories.push(packageDir);
    await mkdir(join(packageDir, "social"));
    await mkdir(join(packageDir, "platforms"));
    await json(join(packageDir, "topic-package.json"), {
      topicId: "topic-1",
      title: "Topic",
      category: "education",
      levels: [],
      visualScenes: { scenes: [] },
    });
    await json(join(packageDir, "qa-report.json"), {
      topicId: "topic-1",
      generatedAt: new Date(0).toISOString(),
      passed: true,
      checks: [],
    });
    await json(join(packageDir, "social", "youtube-batch.json"), [{ title: "Generated title" }]);
    await json(join(packageDir, "platforms", "x.json"), { caption: "X campaign copy" });
    await json(join(packageDir, "platforms", "tiktok.json"), { caption: "TikTok campaign copy" });

    const context = await loadQualityPackage("run-1", packageDir);

    expect(context.socialMetadata).toMatchObject({
      generatedBatches: { youtube: [{ title: "Generated title" }], instagram: null },
      campaignTargets: {
        youtube: null,
        instagram: null,
        x: { caption: "X campaign copy" },
        tiktok: { caption: "TikTok campaign copy" },
      },
    });
  });
});
