import { describe, expect, it } from "vitest";

import {
  createYouTubeClient,
  YouTubePrivateUploadClient,
} from "../src/adapters/index.js";
import type { AppConfig } from "../src/core/config.js";

function config(): AppConfig {
  return {
    dryRun: true,
    publishMode: "review",
    autoPublicPublish: false,
    defaultLevels: ["A1"],
    video: {
      width: 1080,
      height: 1920,
      fps: 30,
      minSeconds: 30,
      maxSeconds: 60,
    },
    scheduler: {
      enabled: false,
      timezone: "Europe/Istanbul",
      runsPerDay: 1,
    },
    lingrootCore: {
      provider: "mock",
      baseUrl: "",
      apiKey: "",
      endpoint: "/internal/video-level-package",
      timeoutMs: 30_000,
      maxAttempts: 3,
      voiceProfile: "english_female",
    },
    image: {
      provider: "mock",
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-image-2",
      size: "1024x1536",
      quality: "medium",
      outputFormat: "png",
      moderation: "auto",
      timeoutMs: 130_000,
      maxAttempts: 3,
    },
    storage: {
      provider: "local",
      bucket: "",
      supabaseUrl: "",
      serviceRoleKey: "",
      timeoutMs: 30_000,
      maxAttempts: 3,
    },
    render: {
      provider: "mock",
      apiKey: "",
      baseUrl: "https://api.json2video.com/v2",
      quality: "high",
      requestTimeoutMs: 30_000,
      pollIntervalMs: 3_000,
      pollTimeoutMs: 600_000,
      pollMaxAttempts: 3,
    },
    youtube: {
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "refresh-token",
      tokenUrl: "https://oauth2.googleapis.com/token",
      uploadBaseUrl: "https://www.googleapis.com/upload/youtube/v3",
      dataBaseUrl: "https://www.googleapis.com/youtube/v3",
      requestTimeoutMs: 60_000,
      maxAttempts: 4,
    },
    instagram: { businessAccountId: "", accessToken: "" },
    google: { applicationCredentials: "" },
  };
}

describe("createYouTubeClient", () => {
  it("creates a private upload client only with complete OAuth config", () => {
    expect(createYouTubeClient(config())).toBeInstanceOf(
      YouTubePrivateUploadClient,
    );
  });

  it("rejects missing refresh tokens", () => {
    const invalid = config();
    invalid.youtube.refreshToken = "";
    expect(() => createYouTubeClient(invalid)).toThrow(
      "YOUTUBE_REFRESH_TOKEN is required",
    );
  });
});
