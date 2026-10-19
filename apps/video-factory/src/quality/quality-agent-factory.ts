import type { AppConfig } from "../core/config.js";
import type { QualityAgentType } from "../core/types.js";
import type { QualityAgent } from "./quality-agent.js";
import { MockQualityAgent } from "./mock-quality-agent.js";
import { OpenAiQualityAgent } from "./openai-quality-agent.js";

export function createQualityAgents(config: AppConfig): QualityAgent[] {
  const types: Array<Exclude<QualityAgentType, "supervisor">> = ["content", "visual", "av_sync", "platform"];
  return types.map((type) => config.quality.provider === "openai"
    ? new OpenAiQualityAgent({
      type,
      apiKey: config.quality.apiKey,
      baseUrl: config.quality.baseUrl,
      model: config.quality.model,
      timeoutMs: config.quality.timeoutMs,
      maxAttempts: config.quality.maxAttempts,
      imageDetail: config.quality.imageDetail,
    })
    : new MockQualityAgent(type));
}
