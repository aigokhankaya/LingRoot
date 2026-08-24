import type { AppConfig } from "../core/config.js";
import { ConfigError } from "../core/errors.js";
import type { LingRootCoreClient } from "../services/lingroot-core-client.js";
import { HttpLingRootCoreClient } from "./http-lingroot-core-client.js";
import { MockLingRootCoreClient } from "./mock-lingroot-core-client.js";

export function createLingRootCoreClient(
  config: AppConfig,
  options: { forceHttp?: boolean } = {},
): LingRootCoreClient {
  const provider = options.forceHttp ? "http" : config.lingrootCore.provider;
  if (config.dryRun && !options.forceHttp) {
    return new MockLingRootCoreClient();
  }
  if (provider === "mock") return new MockLingRootCoreClient();
  if (!config.lingrootCore.baseUrl.trim()) {
    throw new ConfigError(
      "LINGROOT_CORE_API_URL is required when LINGROOT_CORE_PROVIDER=http.",
    );
  }
  if (!config.lingrootCore.apiKey.trim()) {
    throw new ConfigError(
      "LINGROOT_CORE_API_KEY is required when LINGROOT_CORE_PROVIDER=http.",
    );
  }
  return new HttpLingRootCoreClient({
    baseUrl: config.lingrootCore.baseUrl,
    endpoint: config.lingrootCore.endpoint,
    apiKey: config.lingrootCore.apiKey,
    timeoutMs: config.lingrootCore.timeoutMs,
    maxAttempts: config.lingrootCore.maxAttempts,
  });
}
