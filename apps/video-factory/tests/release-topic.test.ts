import { afterEach, describe, expect, it } from "vitest";

import { resetConfigCache } from "../src/core/config.js";
import { writeBinary, writeJson } from "../src/core/file-system.js";
import type {
  ProductionReport,
  TopicBrief,
  YouTubeMetadata,
} from "../src/core/types.js";
import type {
  YouTubeClient,
  YouTubePlaylistItemResult,
  YouTubePlaylistResult,
  YouTubeUploadResult,
} from "../src/services/youtube-client.js";
import { buildYouTubeMetadata } from "../src/services/social-metadata.js";
import {
  initialRunState,
  saveRunState,
} from "../src/workflows/production-run-state.js";
import { releaseTopicProduction } from "../src/workflows/release-topic.js";

const originalDryRun = process.env.DRY_RUN;
const originalPublishMode = process.env.PUBLISH_MODE;
const originalAutoPublicPublish = process.env.AUTO_PUBLIC_PUBLISH;

afterEach(() => {
  if (originalDryRun === undefined) delete process.env.DRY_RUN;
  else process.env.DRY_RUN = originalDryRun;
  if (originalPublishMode === undefined) delete process.env.PUBLISH_MODE;
  else process.env.PUBLISH_MODE = originalPublishMode;
  if (originalAutoPublicPublish === undefined) delete process.env.AUTO_PUBLIC_PUBLISH;
  else process.env.AUTO_PUBLIC_PUBLISH = originalAutoPublicPublish;
  resetConfigCache();
});

class FakeYouTubeClient implements YouTubeClient {
  readonly uploads: string[] = [];
  readonly updates: Array<{ videoId: string; metadata: YouTubeMetadata }> = [];
  readonly memberships: Array<{ playlistId: string; videoId: string }> = [];
  readonly playlistPrivacy: Array<{ playlistId: string; privacyStatus: string }> = [];

  async uploadPrivateVideo(
    _videoPath: string,
    metadata: YouTubeMetadata,
  ): Promise<YouTubeUploadResult> {
    const videoId = `video-${metadata.level}`;
    this.uploads.push(videoId);
    return { provider: "youtube", videoId, privacyStatus: "private", title: metadata.title };
  }

  async updateVideoMetadata(
    videoId: string,
    metadata: YouTubeMetadata,
  ): Promise<YouTubeUploadResult> {
    this.updates.push({ videoId, metadata });
    return { provider: "youtube", videoId, privacyStatus: metadata.privacyStatus, title: metadata.title };
  }

  async ensurePlaylist(
    title: string,
    _description: string,
    privacyStatus: YouTubePlaylistResult["privacyStatus"],
  ): Promise<YouTubePlaylistResult> {
    return {
      playlistId: `playlist-${title.replaceAll(/[^a-z0-9]/gi, "-")}`,
      title,
      privacyStatus,
      created: true,
    };
  }

  async setPlaylistPrivacy(
    playlistId: string,
    privacyStatus: YouTubePlaylistResult["privacyStatus"],
  ): Promise<YouTubePlaylistResult> {
    this.playlistPrivacy.push({ playlistId, privacyStatus });
    return { playlistId, title: playlistId, privacyStatus, created: false };
  }

  async addVideoToPlaylist(
    playlistId: string,
    videoId: string,
  ): Promise<YouTubePlaylistItemResult> {
    this.memberships.push({ playlistId, videoId });
    return { playlistId, videoId, inserted: true, playlistItemId: `${playlistId}-${videoId}` };
  }
}

describe("releaseTopicProduction", () => {
  it("uploads each approved level once, assigns private playlists, and updates links", async () => {
    process.env.DRY_RUN = "false";
    process.env.PUBLISH_MODE = "review";
    process.env.AUTO_PUBLIC_PUBLISH = "false";
    resetConfigCache();
    const packageDir = "outputs/.tmp-release-topic-tests/release-run";
    const topicBrief: TopicBrief = {
      schemaVersion: 1,
      topicId: "memory-habits",
      title: "Memory Habits",
      coreMessage: "Memory improves through practical habits.",
      category: "education",
      language: "en",
      visualOutline: [
        {
          sceneId: "scene-1",
          order: 0,
          narrativeBeat: "A learner practices recall.",
          altText: "A learner practicing recall.",
        },
      ],
    };
    const state = initialRunState({
      runId: "release-run",
      packageDir,
      dryRun: false,
      topicBrief,
      levels: ["A1", "A2"],
      now: new Date("2026-07-14T10:00:00.000Z"),
    });
    state.stage = "review_approved";
    state.qaPassed = true;
    state.reviewApprovedAt = "2026-07-14T10:05:00.000Z";
    for (const level of state.levels) {
      level.status = "rendered";
      level.videoPath = `${packageDir}/levels/${level.level}/video.mp4`;
      await writeBinary(level.videoPath, Buffer.from(`video-${level.level}`));
      await writeJson(
        `${packageDir}/levels/${level.level}/youtube-metadata.json`,
        buildYouTubeMetadata(topicBrief.title, level.level),
      );
    }
    await saveRunState(state);
    const report: ProductionReport = {
      schemaVersion: 1,
      runId: state.runId,
      topicId: topicBrief.topicId,
      startedAt: state.createdAt,
      finishedAt: state.updatedAt,
      dryRun: false,
      publishMode: "review",
      status: "succeeded",
      qaReportRef: null,
      levels: state.levels.map((level) => ({ level: level.level, status: "rendered" })),
      errors: [],
    };
    await writeJson(`${packageDir}/production-report.json`, report);

    const youtube = new FakeYouTubeClient();
    const released = await releaseTopicProduction({ packageDir, youtubeClient: youtube });

    expect(released.stage).toBe("released");
    expect(youtube.uploads).toEqual(["video-A1", "video-A2"]);
    expect(youtube.memberships).toHaveLength(4);
    expect(youtube.updates).toHaveLength(2);
    expect(youtube.updates.every((item) => item.metadata.privacyStatus === "private")).toBe(true);
    expect(youtube.playlistPrivacy.every((item) => item.privacyStatus === "private")).toBe(true);
    expect(youtube.updates[0]?.metadata.description).toContain("video-A2");

    const resumed = await releaseTopicProduction({ packageDir, youtubeClient: youtube });
    expect(resumed.stage).toBe("released");
    expect(youtube.uploads).toEqual(["video-A1", "video-A2"]);

    await expect(releaseTopicProduction({
      packageDir,
      youtubeClient: youtube,
      targetPrivacy: "public",
    })).rejects.toThrow(/PUBLISH_MODE=auto_public/);

    process.env.PUBLISH_MODE = "auto_public";
    process.env.AUTO_PUBLIC_PUBLISH = "true";
    resetConfigCache();
    await releaseTopicProduction({ packageDir, youtubeClient: youtube, targetPrivacy: "private" });
    expect(youtube.updates.slice(-2).every((item) => item.metadata.privacyStatus === "private")).toBe(true);
    await releaseTopicProduction({ packageDir, youtubeClient: youtube, targetPrivacy: "public" });
    expect(youtube.updates.slice(-2).every((item) => item.metadata.privacyStatus === "public")).toBe(true);
    expect(youtube.playlistPrivacy.slice(-3).every((item) => item.privacyStatus === "public")).toBe(true);
  });
});
