import { createYouTubeClient } from "../adapters/index.js";
import {
  assertValid,
  getConfig,
  readJsonFile,
  writeJson,
} from "../core/index.js";
import { ConfigError } from "../core/errors.js";
import type {
  ProductionReport,
  ProductionRunState,
  YouTubeMetadata,
} from "../core/types.js";
import {
  withYouTubeLevelLinks,
  type YouTubeClient,
} from "../services/index.js";
import {
  acquireRunLock,
  readRunState,
  saveRunState,
} from "./production-run-state.js";

export async function approveTopicProduction(packageDir: string): Promise<ProductionRunState> {
  const releaseLock = await acquireRunLock(packageDir);
  try {
    const state = await readRunState(packageDir);
    if (state.stage !== "review_ready" || state.qaPassed !== true) {
      throw new Error("Only a QA-passed review_ready run can be approved.");
    }
    state.stage = "review_approved";
    state.reviewApprovedAt = new Date().toISOString();
    await saveRunState(state);
    return state;
  } finally {
    await releaseLock();
  }
}

export interface ReleaseTopicOptions {
  packageDir: string;
  youtubeClient?: YouTubeClient;
  targetPrivacy?: "private" | "public";
}

export async function releaseTopicProduction(
  options: ReleaseTopicOptions,
): Promise<ProductionRunState> {
  const config = getConfig();
  const releaseLock = await acquireRunLock(options.packageDir);
  try {
    const state = await readRunState(options.packageDir);
    if (state.dryRun) {
      throw new ConfigError("A dry-run package cannot be released to YouTube.");
    }
    if (state.stage !== "review_approved" && state.stage !== "released") {
      throw new Error("YouTube release requires an explicitly review_approved run.");
    }
    const youtube = options.youtubeClient ?? createYouTubeClient(config);
    const topicTitle = state.topicBrief.title;
    if (
      options.targetPrivacy === "public" &&
      (config.publishMode !== "auto_public" || !config.autoPublicPublish)
    ) {
      throw new ConfigError(
        "Public YouTube release requires PUBLISH_MODE=auto_public and AUTO_PUBLIC_PUBLISH=true.",
      );
    }
    const targetPrivacy = options.targetPrivacy ?? (config.publishMode === "auto_public"
      ? "public" as const
      : "private" as const);

    for (const item of state.levels) {
      if (!item.videoPath) {
        throw new Error(`Rendered video path is missing for ${item.level}.`);
      }
      if (!item.youtubeVideoId) {
        const metadata = assertValid(
          "youtube-metadata",
          await readJsonFile<YouTubeMetadata>(
            `${options.packageDir}/levels/${item.level}/youtube-metadata.json`,
          ),
        );
        const uploaded = await youtube.uploadPrivateVideo(item.videoPath, metadata);
        item.youtubeVideoId = uploaded.videoId;
        item.status = "released";
        await saveRunState(state);
      }
    }

    const topicPlaylist = state.topicPlaylistId
      ? { playlistId: state.topicPlaylistId }
      : await youtube.ensurePlaylist(
          `${topicTitle} | All Levels`,
          `LingRoot English listening videos about ${topicTitle}, organized across CEFR levels.`,
          targetPrivacy,
        );
    if (!state.topicPlaylistId) {
      state.topicPlaylistId = topicPlaylist.playlistId;
      await saveRunState(state);
    }

    for (const item of state.levels) {
      const videoId = item.youtubeVideoId;
      if (!videoId) throw new Error(`YouTube video ID is missing for ${item.level}.`);
      await youtube.addVideoToPlaylist(topicPlaylist.playlistId, videoId);
      const playlistId = state.levelPlaylistIds?.[item.level];
      const levelPlaylist = playlistId
        ? { playlistId }
        : await youtube.ensurePlaylist(
            `${item.level} English Listening`,
            `LingRoot ${item.level} English listening practice videos.`,
            targetPrivacy,
          );
      if (!playlistId) {
        state.levelPlaylistIds = {
          ...state.levelPlaylistIds,
          [item.level]: levelPlaylist.playlistId,
        };
        await saveRunState(state);
      }
      await youtube.addVideoToPlaylist(levelPlaylist.playlistId, videoId);
    }

    const videoIds = Object.fromEntries(
      state.levels
        .filter((item): item is typeof item & { youtubeVideoId: string } =>
          typeof item.youtubeVideoId === "string",
        )
        .map((item) => [item.level, item.youtubeVideoId]),
    ) as Partial<Record<(typeof state.levels)[number]["level"], string>>;
    for (const item of state.levels) {
      const metadata = assertValid(
        "youtube-metadata",
        await readJsonFile<YouTubeMetadata>(
          `${options.packageDir}/levels/${item.level}/youtube-metadata.json`,
        ),
      );
      const linked = assertValid(
        "youtube-metadata",
        withYouTubeLevelLinks(metadata, videoIds, topicPlaylist.playlistId),
      );
      linked.privacyStatus = targetPrivacy;
      await youtube.updateVideoMetadata(item.youtubeVideoId as string, linked);
      await writeJson(
        `${options.packageDir}/levels/${item.level}/youtube-metadata.json`,
        linked,
      );
    }

    await youtube.setPlaylistPrivacy(topicPlaylist.playlistId, targetPrivacy);
    for (const playlistId of Object.values(state.levelPlaylistIds ?? {})) {
      if (playlistId) await youtube.setPlaylistPrivacy(playlistId, targetPrivacy);
    }

    state.stage = "released";
    await saveRunState(state);
    const reportPath = `${options.packageDir}/production-report.json`;
    const report = assertValid(
      "production-report",
      await readJsonFile<ProductionReport>(reportPath),
    );
    report.publishMode = targetPrivacy === "public"
      ? "auto_public"
      : "private_upload";
    report.levels = state.levels.map((item) => ({
      level: item.level,
      status: "published",
      videoRef: item.videoPath ?? null,
      youtubeVideoId: item.youtubeVideoId ?? null,
      instagramMediaId: null,
    }));
    assertValid("production-report", report);
    await writeJson(reportPath, report);
    return state;
  } finally {
    await releaseLock();
  }
}
