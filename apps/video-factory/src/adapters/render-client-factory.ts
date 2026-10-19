import type { AppConfig } from "../core/config.js";
import { ConfigError } from "../core/errors.js";
import type { RenderClient } from "../services/render-client.js";
import { FfmpegRenderClient } from "./ffmpeg-render-client.js";
import { Json2VideoRenderClient } from "./json2video-render-client.js";
import { MockRenderClient } from "./mock-render-client.js";

export function createRenderClient(
  config: AppConfig,
  options: { forceJson2Video?: boolean } = {},
): RenderClient {
  if (config.dryRun && !options.forceJson2Video) {
    return new MockRenderClient();
  }
  const provider = options.forceJson2Video
    ? "json2video"
    : config.render.provider;
  if (provider === "mock") return new MockRenderClient();
  if (provider === "ffmpeg") {
    return new FfmpegRenderClient({
      ffmpegPath: config.render.ffmpegPath,
      crf: config.render.ffmpegCrf,
      preset: config.render.ffmpegPreset,
    });
  }
  if (!config.render.apiKey.trim()) {
    throw new ConfigError(
      "JSON2VIDEO_API_KEY is required when RENDER_PROVIDER=json2video.",
    );
  }
  return new Json2VideoRenderClient({
    apiKey: config.render.apiKey,
    baseUrl: config.render.baseUrl,
    quality: config.render.quality,
    requestTimeoutMs: config.render.requestTimeoutMs,
    pollIntervalMs: config.render.pollIntervalMs,
    pollTimeoutMs: config.render.pollTimeoutMs,
    pollMaxAttempts: config.render.pollMaxAttempts,
  });
}
