import { readFile } from "node:fs/promises";

import { ExternalServiceError } from "../core/errors.js";
import { resolvePath } from "../core/file-system.js";
import type {
  QualityAgentType,
  QualityAssessment,
  QualityFinding,
} from "../core/types.js";
import { assertValid } from "../core/validators.js";
import type { QualityAgent, QualityPackageContext } from "./quality-agent.js";

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);
const FINDING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["severity", "category", "scope", "level", "sceneId", "platform", "artifactUri", "evidence", "suggestedAction", "autoFixable"],
  properties: {
    severity: { type: "string", enum: ["info", "low", "medium", "high", "critical"] },
    category: { type: "string" },
    scope: { type: "string", enum: ["package", "level", "scene", "platform"] },
    level: { type: ["string", "null"], enum: ["A1", "A2", "B1", "B2", "C1", "C2", null] },
    sceneId: { type: ["string", "null"] },
    platform: { type: ["string", "null"], enum: ["youtube", "instagram", "x", "tiktok", null] },
    artifactUri: { type: ["string", "null"] },
    evidence: { type: "string" },
    suggestedAction: { type: "string", enum: ["none", "regenerate_image", "rewrite_script", "regenerate_tts", "retime_subtitles", "rerender_video", "rewrite_metadata", "request_human_review"] },
    autoFixable: { type: "boolean" },
  },
} as const;
const MODEL_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["score", "confidence", "summary", "dimensionScores", "findings"],
  properties: {
    score: { type: "number", minimum: 0, maximum: 100 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    summary: { type: "string", maxLength: 700 },
    dimensionScores: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "score"],
        properties: { name: { type: "string" }, score: { type: "number", minimum: 0, maximum: 100 } },
      },
    },
    findings: { type: "array", maxItems: 12, items: FINDING_SCHEMA },
  },
} as const;

interface ModelOutput {
  score: number;
  confidence: number;
  summary: string;
  dimensionScores: Array<{ name: string; score: number }>;
  findings: QualityFinding[];
}

interface ResponsesPayload {
  status?: string;
  incomplete_details?: { reason?: string };
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
}

function normalizedScores(output: ModelOutput): Pick<ModelOutput, "score" | "dimensionScores"> {
  const usesUnitScale = output.score <= 1
    && output.dimensionScores.length > 0
    && output.dimensionScores.every((item) => item.score <= 1);
  if (!usesUnitScale) {
    return { score: output.score, dimensionScores: output.dimensionScores };
  }
  return {
    score: Math.round(output.score * 10_000) / 100,
    dimensionScores: output.dimensionScores.map((item) => ({
      ...item,
      score: Math.round(item.score * 10_000) / 100,
    })),
  };
}

export interface OpenAiQualityAgentOptions {
  type: Exclude<QualityAgentType, "supervisor">;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxAttempts: number;
  imageDetail: "low" | "high";
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

function contextFor(type: OpenAiQualityAgentOptions["type"], context: QualityPackageContext): Record<string, unknown> {
  const common = {
    topic: {
      id: context.topicPackage.topicId,
      title: context.topicPackage.title,
      category: context.topicPackage.category,
      scenes: context.topicPackage.visualScenes.scenes.map(({ sceneId, narrativeBeat, altText, imagePrompt }) => ({ sceneId, narrativeBeat, altText, imagePrompt })),
    },
  };
  if (type === "content") return { ...common, levels: context.topicPackage.levels, qaChecks: context.qaReport.checks.filter((item) => item.id.startsWith("cefr-")) };
  if (type === "visual") return { ...common, availableImages: context.images.map(({ sceneId, uri }) => ({ sceneId, uri })) };
  if (type === "av_sync") return {
    ...common,
    levels: context.topicPackage.levels.map((item) => ({ level: item.level, audio: item.audio, subtitle: item.subtitle, timeline: item.timeline })),
    qaChecks: context.qaReport.checks.filter((item) => item.id.startsWith("media-") || item.id.includes("subtitle") || item.id.includes("speaking-rate")),
  };
  return { ...common, metadata: context.socialMetadata };
}

export class OpenAiQualityAgent implements QualityAgent {
  readonly type: OpenAiQualityAgentOptions["type"];
  private readonly options: OpenAiQualityAgentOptions;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(options: OpenAiQualityAgentOptions) {
    if (!options.apiKey.trim()) throw new ExternalServiceError("QUALITY_AGENT_API_KEY is required for OpenAI quality review.");
    this.type = options.type;
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  async evaluate(context: QualityPackageContext): Promise<QualityAssessment> {
    const promptVersion = this.type === "av_sync" ? "av-sync-v1" : `${this.type}-v1`;
    const instructions = await readFile(resolvePath(`prompts/quality/${promptVersion}.txt`), "utf8");
    const content: Array<Record<string, unknown>> = [
      { type: "input_text", text: JSON.stringify(contextFor(this.type, context)) },
    ];
    if (this.type === "visual") {
      for (const image of context.images) {
        content.push({ type: "input_text", text: `Scene image: ${image.sceneId}` });
        content.push({ type: "input_image", image_url: image.imageUrl, detail: this.options.imageDetail });
      }
    }
    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
      try {
        const response = await this.fetchImpl(`${this.options.baseUrl.replace(/\/+$/, "")}/responses`, {
          method: "POST",
          headers: { authorization: `Bearer ${this.options.apiKey}`, "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            model: this.options.model,
            store: false,
            instructions,
            input: [{ role: "user", content }],
            max_output_tokens: 8000,
            text: { format: { type: "json_schema", name: `lingroot_${this.type}_quality`, strict: true, schema: MODEL_OUTPUT_SCHEMA } },
          }),
        });
        if (!response.ok) {
          if (RETRYABLE.has(response.status) && attempt < this.options.maxAttempts) {
            await this.sleep(500 * attempt);
            continue;
          }
          throw new ExternalServiceError(`OpenAI quality agent failed with HTTP ${response.status}.`, { statusCode: response.status, retryable: RETRYABLE.has(response.status) });
        }
        const payload = await response.json() as ResponsesPayload;
        if (payload.status === "incomplete") {
          throw new ExternalServiceError(
            `OpenAI quality agent returned an incomplete response (${payload.incomplete_details?.reason || "unknown reason"}).`,
            { retryable: true },
          );
        }
        const outputText = payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
        if (!outputText) throw new ExternalServiceError("OpenAI quality agent returned no structured output.");
        const parsed = JSON.parse(outputText) as ModelOutput;
        const scores = normalizedScores(parsed);
        return assertValid("quality-assessment", {
          schemaVersion: 1,
          agentType: this.type,
          scope: "package",
          level: null,
          sceneId: null,
          platform: null,
          score: scores.score,
          confidence: parsed.confidence,
          summary: parsed.summary,
          dimensionScores: Object.fromEntries(scores.dimensionScores.map((item) => [item.name, item.score])),
          findings: parsed.findings,
          provider: "openai",
          model: this.options.model,
          promptVersion,
          usage: {
            inputTokens: payload.usage?.input_tokens ?? 0,
            outputTokens: payload.usage?.output_tokens ?? 0,
            totalTokens: payload.usage?.total_tokens ?? 0,
          },
        });
      } catch (error) {
        if (error instanceof ExternalServiceError && error.retryable && attempt < this.options.maxAttempts) {
          await this.sleep(500 * attempt);
          continue;
        }
        if (error instanceof SyntaxError) {
          if (attempt < this.options.maxAttempts) {
            await this.sleep(500 * attempt);
            continue;
          }
          throw new ExternalServiceError("OpenAI quality agent returned invalid JSON.");
        }
        if (error instanceof Error && error.name === "AbortError" && attempt < this.options.maxAttempts) continue;
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new ExternalServiceError("OpenAI quality agent exhausted retries.", { retryable: true });
  }
}
