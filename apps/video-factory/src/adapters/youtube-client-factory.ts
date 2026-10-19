import type { AppConfig } from "../core/config.js";
import { ConfigError } from "../core/errors.js";
import type { YouTubeClient } from "../services/youtube-client.js";
import { YouTubePrivateUploadClient } from "./youtube-private-upload-client.js";

export function createYouTubeClient(config: AppConfig): YouTubeClient {
  for (const [name, value] of [
    ["YOUTUBE_CLIENT_ID", config.youtube.clientId],
    ["YOUTUBE_CLIENT_SECRET", config.youtube.clientSecret],
    ["YOUTUBE_REFRESH_TOKEN", config.youtube.refreshToken],
  ]) {
    if (!value.trim()) throw new ConfigError(`${name} is required.`);
  }
  return new YouTubePrivateUploadClient({
    clientId: config.youtube.clientId,
    clientSecret: config.youtube.clientSecret,
    refreshToken: config.youtube.refreshToken,
    tokenUrl: config.youtube.tokenUrl,
    uploadBaseUrl: config.youtube.uploadBaseUrl,
    dataBaseUrl: config.youtube.dataBaseUrl,
    requestTimeoutMs: config.youtube.requestTimeoutMs,
    maxAttempts: config.youtube.maxAttempts,
  });
}
