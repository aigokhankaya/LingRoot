import type { AppConfig } from "../core/config.js";
import { ConfigError } from "../core/errors.js";
import type { TopicSourceClient } from "../services/topic-source-client.js";
import { HttpTopicSourceClient } from "./http-topic-source-client.js";
import { MockTopicSourceClient } from "./mock-topic-source-client.js";

export function createTopicSourceClient(
  config: AppConfig,
  options: { forceHttp?: boolean } = {},
): TopicSourceClient {
  const provider = options.forceHttp ? "http" : config.lingrootTopic.provider;
  if (config.dryRun && !options.forceHttp) return new MockTopicSourceClient();
  if (provider === "mock") return new MockTopicSourceClient();
  if (!config.lingrootTopic.baseUrl.trim()) {
    throw new ConfigError(
      "LINGROOT_TOPIC_API_URL is required when LINGROOT_TOPIC_PROVIDER=http.",
    );
  }
  if (!config.lingrootTopic.apiKey.trim()) {
    throw new ConfigError(
      "LINGROOT_TOPIC_API_KEY is required when LINGROOT_TOPIC_PROVIDER=http.",
    );
  }
  return new HttpTopicSourceClient({
    baseUrl: config.lingrootTopic.baseUrl,
    endpoint: config.lingrootTopic.endpoint,
    apiKey: config.lingrootTopic.apiKey,
    timeoutMs: config.lingrootTopic.timeoutMs,
    maxAttempts: config.lingrootTopic.maxAttempts,
  });
}
