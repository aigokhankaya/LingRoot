import { describe, expect, it } from "vitest";

import {
  createRenderClient,
  FfmpegRenderClient,
  Json2VideoRenderClient,
  MockRenderClient,
} from "../src/adapters/index.js";
import type { AppConfig } from "../src/core/config.js";

function config(): AppConfig {
  return {
    dryRun: true,
    publishMode: "review",
    autoPublicPublish: false,
    defaultLevels: ["A1", "A2", "B1", "B2", "C1", "C2"],
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
    lingrootTopic: {
      provider: "mock",
      baseUrl: "",
      apiKey: "",
      endpoint: "/internal/video-topic-brief",
      timeoutMs: 30_000,
      maxAttempts: 3,
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
      provider: "json2video",
      apiKey: "test-key",
      baseUrl: "https://api.json2video.com/v2",
      quality: "high",
      requestTimeoutMs: 30_000,
      pollIntervalMs: 3_000,
      pollTimeoutMs: 600_000,
      pollMaxAttempts: 3,
      ffmpegPath: "ffmpeg",
      ffmpegCrf: 20,
      ffmpegPreset: "medium",
    },
    youtube: {
      clientId: "",
      clientSecret: "",
      refreshToken: "",
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

describe("createRenderClient", () => {
  it("forces mock rendering during dry-run", () => {
    expect(createRenderClient(config())).toBeInstanceOf(MockRenderClient);
  });

  it("creates JSON2Video only for an explicit render check", () => {
    expect(
      createRenderClient(config(), { forceJson2Video: true }),
    ).toBeInstanceOf(Json2VideoRenderClient);
  });

  it("uses local FFmpeg for a real production render", () => {
    const appConfig = config();
    appConfig.dryRun = false;
    appConfig.render.provider = "ffmpeg";

    expect(createRenderClient(appConfig)).toBeInstanceOf(FfmpegRenderClient);
  });
});
