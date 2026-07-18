import type { AppConfig } from "../core/config.js";
import { ConfigError } from "../core/errors.js";
import type { ImageClient } from "../services/image-client.js";
import { MockImageClient } from "./mock-image-client.js";
import { OpenAiImageClient } from "./openai-image-client.js";

export function createImageClient(
  config: AppConfig,
  options: { forceOpenAi?: boolean } = {},
): ImageClient {
  if (config.dryRun && !options.forceOpenAi) {
    return new MockImageClient();
  }
  const provider = options.forceOpenAi ? "openai" : config.image.provider;
  if (provider === "mock") return new MockImageClient();
  if (!config.image.apiKey.trim()) {
    throw new ConfigError(
      "OPENAI_API_KEY is required when IMAGE_PROVIDER=openai.",
    );
  }
  return new OpenAiImageClient({
    apiKey: config.image.apiKey,
    baseUrl: config.image.baseUrl,
    model: config.image.model,
    timeoutMs: config.image.timeoutMs,
    maxAttempts: config.image.maxAttempts,
    organization: config.image.organization,
    project: config.image.project,
  });
}
