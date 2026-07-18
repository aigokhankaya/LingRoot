import { describe, expect, it } from "vitest";

import { MockImageClient } from "../src/adapters/mock-image-client.js";
import {
  readJsonFile,
  writeBinaryPlaceholder,
} from "../src/core/file-system.js";
import type {
  LevelPackage,
  RenderPayload,
} from "../src/core/types.js";
import type {
  RenderResult,
  StorageClient,
} from "../src/services/index.js";
import { buildLevelPackage } from "../src/testing/fixtures.js";
import { runSingleLevelIntegrationCheck } from "../src/workflows/run-single-level-integration-check.js";
import { runMultiLevelIntegrationCheck } from "../src/workflows/run-single-level-integration-check.js";

describe("runSingleLevelIntegrationCheck", () => {
  it("uses signed URLs transiently and cleans remote objects", async () => {
    const removed: string[] = [];
    const stored: string[] = [];
    let renderedPayload: RenderPayload | undefined;
    const storage: StorageClient = {
      store: async (key, data, options) => {
        stored.push(key);
        return {
          provider: "test-storage",
          bucket: "private",
          key,
          path: `supabase://private/${key}`,
          bytes:
            typeof data === "string"
              ? new TextEncoder().encode(data).length
              : data.byteLength,
          contentType:
            options?.contentType ?? "application/octet-stream",
        };
      },
      retrieve: async () => Buffer.alloc(0),
      remove: async (key) => {
        removed.push(key);
      },
      createSignedReadUrl: async (key) =>
        `https://storage.example.com/${key}?token=transient-secret`,
    };
    const outputRoot = "outputs/.tmp-integration-tests";

    const completed = await runSingleLevelIntegrationCheck({
      topic: "Why sleep helps memory",
      level: "A1",
      sceneCount: 1,
      durationSeconds: 10,
      signedUrlExpiresInSeconds: 900,
      outputRoot,
      imageSize: "1024x1536",
      imageQuality: "low",
      imageOutputFormat: "png",
      voiceProfile: "english_female",
      imageClient: new MockImageClient(),
      storageClient: storage,
      coreClient: {
        getLevelPackage: async (params): Promise<LevelPackage> => {
          const pkg = buildLevelPackage(
            params.topicId,
            params.level,
            params.visualScenes,
          );
          pkg.audio.ref = "https://core.example.com/audio.mp3";
          pkg.subtitle.ref = "https://core.example.com/subtitles.srt";
          pkg.audio.durationSeconds = 10;
          return pkg;
        },
      },
      renderClient: {
        render: async (payload): Promise<RenderResult> => {
          renderedPayload = payload;
          await writeBinaryPlaceholder(
            payload.outputPath as string,
            "integration-video",
          );
          return {
            level: payload.level,
            render_status: "done",
            provider: "test-render",
            project_id: "project-test",
            video_url: "https://render.example.com/video.mp4",
            local_video_path: payload.outputPath,
            duration_seconds: 10,
            resolution: "1080x1920",
          };
        },
      },
    });

    expect(renderedPayload?.visualScenes.scenes[0].imageRef).toContain(
      "token=transient-secret",
    );
    expect(stored).toHaveLength(1);
    expect(removed).toEqual(stored);

    const summary = await readJsonFile<Record<string, unknown>>(
      `${completed.outputDir}/summary.json`,
    );
    const serialized = JSON.stringify(summary);
    expect(serialized).toContain("supabase://private/");
    expect(serialized).not.toContain("transient-secret");
    expect(serialized).not.toContain("core.example.com");
  });

  it("reuses one generated image across multiple level renders", async () => {
    const imageDelegate = new MockImageClient();
    let imageCalls = 0;
    const renderedLevels: string[] = [];
    const removed: string[] = [];
    const outputRoot = "outputs/.tmp-integration-tests";

    const completed = await runMultiLevelIntegrationCheck({
      topic: "How repetition supports learning",
      levels: ["A1", "A2"],
      sceneCount: 1,
      durationSeconds: 10,
      signedUrlExpiresInSeconds: 1800,
      outputRoot,
      imageSize: "1024x1536",
      imageQuality: "low",
      imageOutputFormat: "png",
      voiceProfile: "english_female",
      imageClient: {
        generateImage: async (request) => {
          imageCalls += 1;
          return imageDelegate.generateImage(request);
        },
      },
      storageClient: {
        store: async (key, data, options) => ({
          provider: "test-storage",
          bucket: "private",
          key,
          path: `supabase://private/${key}`,
          bytes:
            typeof data === "string"
              ? new TextEncoder().encode(data).length
              : data.byteLength,
          contentType:
            options?.contentType ?? "application/octet-stream",
        }),
        retrieve: async () => Buffer.alloc(0),
        remove: async (key) => {
          removed.push(key);
        },
        createSignedReadUrl: async (key) =>
          `https://storage.example.com/${key}?token=temporary`,
      },
      coreClient: {
        getLevelPackage: async (params) => {
          const pkg = buildLevelPackage(
            params.topicId,
            params.level,
            params.visualScenes,
          );
          pkg.audio.ref = `https://core.example.com/${params.level}/audio.mp3`;
          pkg.subtitle.ref = `https://core.example.com/${params.level}/subtitles.srt`;
          pkg.audio.durationSeconds = 10;
          return pkg;
        },
      },
      renderClient: {
        render: async (payload) => {
          renderedLevels.push(payload.level);
          await writeBinaryPlaceholder(
            payload.outputPath as string,
            `video-${payload.level}`,
          );
          return {
            level: payload.level,
            render_status: "done",
            provider: "test-render",
            project_id: `project-${payload.level}`,
            video_url: null,
            local_video_path: payload.outputPath,
            duration_seconds: 10,
            resolution: "1080x1920",
          };
        },
      },
    });

    expect(imageCalls).toBe(1);
    expect(renderedLevels).toEqual(["A1", "A2"]);
    expect(completed.results).toHaveLength(2);
    expect(removed).toHaveLength(1);
  });
});
