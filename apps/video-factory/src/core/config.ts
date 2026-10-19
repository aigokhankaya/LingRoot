/**
 * Environment configuration loader (skeleton).
 *
 * Loads `.env` via dotenv and exposes a typed, validated view of the
 * environment. SECURITY: `.env` is never committed and secret values are never
 * logged (see {@link redactSecrets}).
 */

import { config as loadDotenv } from "dotenv";

import { ConfigError } from "./errors.js";
import type {
  CefrLevel,
  ImageOutputFormat,
  ImageQuality,
  PublishMode,
} from "./types.js";

loadDotenv();

const ALL_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const PUBLISH_MODES: PublishMode[] = ["review", "private_upload", "auto_public"];
const FFMPEG_PRESETS = [
  "ultrafast",
  "superfast",
  "veryfast",
  "faster",
  "fast",
  "medium",
  "slow",
] as const;

function str(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

function bool(key: string, fallback = false): boolean {
  const v = process.env[key];
  if (v === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(v.trim());
}

function int(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v.trim() === "") return fallback;
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) throw new ConfigError(`Env ${key} must be an integer, got "${v}"`);
  return n;
}

function levels(key: string, fallback: CefrLevel[]): CefrLevel[] {
  const v = process.env[key];
  if (!v) return fallback;
  const parsed = v
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  for (const lvl of parsed) {
    if (!ALL_LEVELS.includes(lvl as CefrLevel)) {
      throw new ConfigError(`Env ${key} contains invalid CEFR level "${lvl}"`);
    }
  }
  return parsed as CefrLevel[];
}

function publishMode(key: string, fallback: PublishMode): PublishMode {
  const v = process.env[key]?.trim().toLowerCase();
  if (!v) return fallback;
  if (!PUBLISH_MODES.includes(v as PublishMode)) {
    throw new ConfigError(`Env ${key} must be one of ${PUBLISH_MODES.join(", ")}, got "${v}"`);
  }
  return v as PublishMode;
}

export interface AppConfig {
  /** Default production path remains mock-only until all media adapters exist. */
  dryRun: boolean;
  publishMode: PublishMode;
  autoPublicPublish: boolean;
  defaultLevels: CefrLevel[];
  video: { width: number; height: number; fps: number; minSeconds: number; maxSeconds: number };
  scheduler: { enabled: boolean; timezone: string; runsPerDay: number };
  /** Secret-bearing groups. Presence-only here; values stay in env, never logged. */
  lingrootCore: {
    provider: "mock" | "http";
    baseUrl: string;
    apiKey: string;
    endpoint: string;
    timeoutMs: number;
    maxAttempts: number;
    voiceProfile: string;
  };
  lingrootTopic: {
    provider: "mock" | "http";
    baseUrl: string;
    apiKey: string;
    endpoint: string;
    timeoutMs: number;
    maxAttempts: number;
  };
  image: {
    provider: "mock" | "openai";
    apiKey: string;
    baseUrl: string;
    model: string;
    size: string;
    quality: ImageQuality;
    outputFormat: ImageOutputFormat;
    moderation: "auto";
    timeoutMs: number;
    maxAttempts: number;
    organization?: string;
    project?: string;
  };
  quality: {
    provider: "mock" | "openai";
    mode: "shadow" | "enforced";
    apiKey: string;
    baseUrl: string;
    model: string;
    timeoutMs: number;
    maxAttempts: number;
    rubricVersion: string;
    imageDetail: "low" | "high";
  };
  storage: {
    provider: "local" | "supabase";
    bucket: string;
    supabaseUrl: string;
    serviceRoleKey: string;
    timeoutMs: number;
    maxAttempts: number;
  };
  render: {
    provider: "mock" | "ffmpeg" | "json2video";
    apiKey: string;
    baseUrl: string;
    quality: "low" | "medium" | "high";
    requestTimeoutMs: number;
    pollIntervalMs: number;
    pollTimeoutMs: number;
    pollMaxAttempts: number;
    ffmpegPath: string;
    ffmpegCrf: number;
    ffmpegPreset: (typeof FFMPEG_PRESETS)[number];
  };
  youtube: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    tokenUrl: string;
    uploadBaseUrl: string;
    dataBaseUrl: string;
    requestTimeoutMs: number;
    maxAttempts: number;
  };
  instagram: { businessAccountId: string; accessToken: string };
  google: { applicationCredentials: string };
}

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;
  cached = {
    dryRun: bool("DRY_RUN", true),
    publishMode: publishMode("PUBLISH_MODE", "review"),
    autoPublicPublish: bool("AUTO_PUBLIC_PUBLISH", false),
    defaultLevels: levels("DEFAULT_LEVELS", ALL_LEVELS),
    video: {
      width: int("VIDEO_WIDTH", 1080),
      height: int("VIDEO_HEIGHT", 1920),
      fps: int("VIDEO_FPS", 30),
      minSeconds: int("VIDEO_MIN_SECONDS", 30),
      maxSeconds: int("VIDEO_MAX_SECONDS", 60),
    },
    scheduler: {
      enabled: bool("SCHEDULER_ENABLED", false),
      timezone: str("SCHEDULER_TIMEZONE", "Europe/Istanbul"),
      runsPerDay: int("SCHEDULER_RUNS_PER_DAY", 1),
    },
    lingrootCore: {
      provider: str("LINGROOT_CORE_PROVIDER", "mock") as "mock" | "http",
      baseUrl: str("LINGROOT_CORE_API_URL"),
      apiKey: str("LINGROOT_CORE_API_KEY"),
      endpoint: str(
        "LINGROOT_CORE_LEVEL_ENDPOINT",
        "/internal/video-level-package",
      ),
      timeoutMs: int("LINGROOT_CORE_TIMEOUT_MS", 30_000),
      maxAttempts: int("LINGROOT_CORE_MAX_ATTEMPTS", 3),
      voiceProfile: str("LINGROOT_CORE_VOICE_PROFILE", "english_female"),
    },
    lingrootTopic: {
      provider: str("LINGROOT_TOPIC_PROVIDER", "mock") as "mock" | "http",
      baseUrl: str("LINGROOT_TOPIC_API_URL", str("LINGROOT_CORE_API_URL")),
      apiKey: str("LINGROOT_TOPIC_API_KEY", str("LINGROOT_CORE_API_KEY")),
      endpoint: str("LINGROOT_TOPIC_ENDPOINT", "/internal/video-topic-brief"),
      timeoutMs: int("LINGROOT_TOPIC_TIMEOUT_MS", 30_000),
      maxAttempts: int("LINGROOT_TOPIC_MAX_ATTEMPTS", 3),
    },
    image: {
      provider: str("IMAGE_PROVIDER", "mock") as "mock" | "openai",
      apiKey: str("OPENAI_API_KEY", str("IMAGE_API_KEY")),
      baseUrl: str("OPENAI_API_BASE_URL", "https://api.openai.com/v1"),
      model: str("OPENAI_IMAGE_MODEL", "gpt-image-2"),
      size: str("OPENAI_IMAGE_SIZE", "1024x1536"),
      quality: str("OPENAI_IMAGE_QUALITY", "medium") as ImageQuality,
      outputFormat: str(
        "OPENAI_IMAGE_OUTPUT_FORMAT",
        "png",
      ) as ImageOutputFormat,
      moderation: str("OPENAI_IMAGE_MODERATION", "auto") as "auto",
      timeoutMs: int("OPENAI_IMAGE_TIMEOUT_MS", 130_000),
      maxAttempts: int("OPENAI_IMAGE_MAX_ATTEMPTS", 3),
      organization: str("OPENAI_ORGANIZATION") || undefined,
      project: str("OPENAI_PROJECT") || undefined,
    },
    quality: {
      provider: str("QUALITY_AGENT_PROVIDER", "mock") as "mock" | "openai",
      mode: str("QUALITY_AGENT_MODE", "shadow") as "shadow" | "enforced",
      apiKey: str("QUALITY_AGENT_API_KEY", str("OPENAI_API_KEY")),
      baseUrl: str("QUALITY_AGENT_API_BASE_URL", str("OPENAI_API_BASE_URL", "https://api.openai.com/v1")),
      model: str("QUALITY_AGENT_MODEL", "gpt-5-mini"),
      timeoutMs: int("QUALITY_AGENT_TIMEOUT_MS", 90_000),
      maxAttempts: int("QUALITY_AGENT_MAX_ATTEMPTS", 2),
      rubricVersion: str("QUALITY_RUBRIC_VERSION", "v1"),
      imageDetail: str("QUALITY_IMAGE_DETAIL", "low") as "low" | "high",
    },
    storage: {
      provider: str("STORAGE_PROVIDER", "local") as "local" | "supabase",
      bucket: str("SUPABASE_STORAGE_BUCKET", str("STORAGE_BUCKET")),
      supabaseUrl: str("SUPABASE_URL"),
      serviceRoleKey: str("SUPABASE_SERVICE_ROLE_KEY"),
      timeoutMs: int("SUPABASE_STORAGE_TIMEOUT_MS", 30_000),
      maxAttempts: int("SUPABASE_STORAGE_MAX_ATTEMPTS", 3),
    },
    render: {
      provider: str("RENDER_PROVIDER", "ffmpeg") as
        | "mock"
        | "ffmpeg"
        | "json2video",
      apiKey: str("JSON2VIDEO_API_KEY"),
      baseUrl: str(
        "JSON2VIDEO_API_BASE_URL",
        "https://api.json2video.com/v2",
      ),
      quality: str("JSON2VIDEO_QUALITY", "high") as
        | "low"
        | "medium"
        | "high",
      requestTimeoutMs: int("JSON2VIDEO_REQUEST_TIMEOUT_MS", 30_000),
      pollIntervalMs: int("JSON2VIDEO_POLL_INTERVAL_MS", 3_000),
      pollTimeoutMs: int("JSON2VIDEO_POLL_TIMEOUT_MS", 600_000),
      pollMaxAttempts: int("JSON2VIDEO_POLL_MAX_ATTEMPTS", 3),
      ffmpegPath: str("FFMPEG_PATH", "ffmpeg"),
      ffmpegCrf: int("FFMPEG_CRF", 23),
      ffmpegPreset: str("FFMPEG_PRESET", "veryfast") as (typeof FFMPEG_PRESETS)[number],
    },
    youtube: {
      clientId: str("YOUTUBE_CLIENT_ID"),
      clientSecret: str("YOUTUBE_CLIENT_SECRET"),
      refreshToken: str("YOUTUBE_REFRESH_TOKEN"),
      tokenUrl: str(
        "YOUTUBE_OAUTH_TOKEN_URL",
        "https://oauth2.googleapis.com/token",
      ),
      uploadBaseUrl: str(
        "YOUTUBE_UPLOAD_BASE_URL",
        "https://www.googleapis.com/upload/youtube/v3",
      ),
      dataBaseUrl: str(
        "YOUTUBE_DATA_API_BASE_URL",
        "https://www.googleapis.com/youtube/v3",
      ),
      requestTimeoutMs: int("YOUTUBE_REQUEST_TIMEOUT_MS", 60_000),
      maxAttempts: int("YOUTUBE_UPLOAD_MAX_ATTEMPTS", 4),
    },
    instagram: {
      businessAccountId: str("INSTAGRAM_BUSINESS_ACCOUNT_ID"),
      accessToken: str("INSTAGRAM_ACCESS_TOKEN"),
    },
    google: { applicationCredentials: str("GOOGLE_APPLICATION_CREDENTIALS") },
  };
  if (cached.publishMode === "auto_public" && !cached.autoPublicPublish) {
    throw new ConfigError(
      "PUBLISH_MODE=auto_public requires AUTO_PUBLIC_PUBLISH=true",
    );
  }
  if (!["mock", "http"].includes(cached.lingrootCore.provider)) {
    throw new ConfigError(
      `LINGROOT_CORE_PROVIDER must be mock or http, got "${cached.lingrootCore.provider}"`,
    );
  }
  if (cached.lingrootCore.timeoutMs <= 0) {
    throw new ConfigError("LINGROOT_CORE_TIMEOUT_MS must be positive.");
  }
  if (cached.lingrootCore.maxAttempts < 1) {
    throw new ConfigError("LINGROOT_CORE_MAX_ATTEMPTS must be at least 1.");
  }
  if (!["mock", "http"].includes(cached.lingrootTopic.provider)) {
    throw new ConfigError(
      `LINGROOT_TOPIC_PROVIDER must be mock or http, got "${cached.lingrootTopic.provider}"`,
    );
  }
  if (cached.lingrootTopic.timeoutMs <= 0) {
    throw new ConfigError("LINGROOT_TOPIC_TIMEOUT_MS must be positive.");
  }
  if (cached.lingrootTopic.maxAttempts < 1) {
    throw new ConfigError("LINGROOT_TOPIC_MAX_ATTEMPTS must be at least 1.");
  }
  if (!["mock", "openai"].includes(cached.image.provider)) {
    throw new ConfigError(
      `IMAGE_PROVIDER must be mock or openai, got "${cached.image.provider}"`,
    );
  }
  if (!["low", "medium", "high", "auto"].includes(cached.image.quality)) {
    throw new ConfigError(
      `OPENAI_IMAGE_QUALITY must be low, medium, high or auto, got "${cached.image.quality}"`,
    );
  }
  if (!["png", "jpeg", "webp"].includes(cached.image.outputFormat)) {
    throw new ConfigError(
      `OPENAI_IMAGE_OUTPUT_FORMAT must be png, jpeg or webp, got "${cached.image.outputFormat}"`,
    );
  }
  if (cached.image.moderation !== "auto") {
    throw new ConfigError(
      "OPENAI_IMAGE_MODERATION must remain auto for this project.",
    );
  }
  validateImageSize(cached.image.size);
  if (cached.image.timeoutMs <= 0) {
    throw new ConfigError("OPENAI_IMAGE_TIMEOUT_MS must be positive.");
  }
  if (cached.image.maxAttempts < 1) {
    throw new ConfigError("OPENAI_IMAGE_MAX_ATTEMPTS must be at least 1.");
  }
  if (!["mock", "openai"].includes(cached.quality.provider)) {
    throw new ConfigError(`QUALITY_AGENT_PROVIDER must be mock or openai, got "${cached.quality.provider}"`);
  }
  if (!["shadow", "enforced"].includes(cached.quality.mode)) {
    throw new ConfigError(`QUALITY_AGENT_MODE must be shadow or enforced, got "${cached.quality.mode}"`);
  }
  if (cached.quality.timeoutMs <= 0 || cached.quality.maxAttempts < 1) {
    throw new ConfigError("Quality agent timeout and attempts must be positive.");
  }
  if (!["low", "high"].includes(cached.quality.imageDetail)) {
    throw new ConfigError("QUALITY_IMAGE_DETAIL must be low or high.");
  }
  if (!["local", "supabase"].includes(cached.storage.provider)) {
    throw new ConfigError(
      `STORAGE_PROVIDER must be local or supabase, got "${cached.storage.provider}"`,
    );
  }
  if (cached.storage.timeoutMs <= 0) {
    throw new ConfigError("SUPABASE_STORAGE_TIMEOUT_MS must be positive.");
  }
  if (cached.storage.maxAttempts < 1) {
    throw new ConfigError(
      "SUPABASE_STORAGE_MAX_ATTEMPTS must be at least 1.",
    );
  }
  if (!["mock", "ffmpeg", "json2video"].includes(cached.render.provider)) {
    throw new ConfigError(
      `RENDER_PROVIDER must be mock, ffmpeg or json2video, got "${cached.render.provider}"`,
    );
  }
  if (!["low", "medium", "high"].includes(cached.render.quality)) {
    throw new ConfigError(
      `JSON2VIDEO_QUALITY must be low, medium or high, got "${cached.render.quality}"`,
    );
  }
  for (const [key, value] of [
    ["JSON2VIDEO_REQUEST_TIMEOUT_MS", cached.render.requestTimeoutMs],
    ["JSON2VIDEO_POLL_INTERVAL_MS", cached.render.pollIntervalMs],
    ["JSON2VIDEO_POLL_TIMEOUT_MS", cached.render.pollTimeoutMs],
    ["JSON2VIDEO_POLL_MAX_ATTEMPTS", cached.render.pollMaxAttempts],
  ] as const) {
    if (value <= 0) throw new ConfigError(`${key} must be positive.`);
  }
  if (!cached.render.ffmpegPath.trim()) {
    throw new ConfigError("FFMPEG_PATH must not be empty.");
  }
  if (cached.render.ffmpegCrf < 0 || cached.render.ffmpegCrf > 51) {
    throw new ConfigError("FFMPEG_CRF must be an integer between 0 and 51.");
  }
  if (!FFMPEG_PRESETS.includes(cached.render.ffmpegPreset)) {
    throw new ConfigError(
      `FFMPEG_PRESET must be one of ${FFMPEG_PRESETS.join(", ")}, got "${cached.render.ffmpegPreset}"`,
    );
  }
  if (cached.youtube.requestTimeoutMs <= 0) {
    throw new ConfigError("YOUTUBE_REQUEST_TIMEOUT_MS must be positive.");
  }
  if (cached.youtube.maxAttempts < 1) {
    throw new ConfigError(
      "YOUTUBE_UPLOAD_MAX_ATTEMPTS must be at least 1.",
    );
  }
  return cached;
}

/** Test/CLI helper to force a re-read of the environment. */
export function resetConfigCache(): void {
  cached = null;
}

export function validateImageSize(value: string): void {
  if (value === "auto") return;
  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) {
    throw new ConfigError(
      `OPENAI_IMAGE_SIZE must be auto or WIDTHxHEIGHT, got "${value}"`,
    );
  }
  const width = Number(match[1]);
  const height = Number(match[2]);
  const shortEdge = Math.min(width, height);
  const longEdge = Math.max(width, height);
  const pixels = width * height;
  if (
    width % 16 !== 0 ||
    height % 16 !== 0 ||
    longEdge > 3840 ||
    longEdge / shortEdge > 3 ||
    pixels < 655_360 ||
    pixels > 8_294_400
  ) {
    throw new ConfigError(
      `OPENAI_IMAGE_SIZE "${value}" violates GPT Image size constraints.`,
    );
  }
}
