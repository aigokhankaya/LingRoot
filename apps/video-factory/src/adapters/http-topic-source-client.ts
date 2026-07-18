import { ExternalServiceError, ValidationError } from "../core/errors.js";
import type { TopicBrief } from "../core/types.js";
import { assertValid } from "../core/validators.js";
import type {
  GetTopicBriefParams,
  TopicSourceClient,
} from "../services/topic-source-client.js";

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface HttpTopicSourceClientOptions {
  baseUrl: string;
  endpoint?: string;
  apiKey: string;
  timeoutMs?: number;
  maxAttempts?: number;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

function buildUrl(baseUrl: string, endpoint: string): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new ExternalServiceError("LINGROOT_TOPIC_API_URL must be a valid URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new ExternalServiceError("LingRoot topic API URL must use http or https.");
  }
  return `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;
}

function validateOutline(brief: TopicBrief, expectedSceneCount: number): void {
  if (brief.visualOutline.length !== expectedSceneCount) {
    throw new ExternalServiceError(
      `LingRoot topic visualOutline must contain ${expectedSceneCount} scenes.`,
    );
  }
  const ids = new Set(brief.visualOutline.map((scene) => scene.sceneId));
  if (
    ids.size !== brief.visualOutline.length ||
    brief.visualOutline.some((scene, index) => scene.order !== index)
  ) {
    throw new ExternalServiceError(
      "LingRoot topic visualOutline must use unique contiguous scene order.",
    );
  }
}

export class HttpTopicSourceClient implements TopicSourceClient {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(options: HttpTopicSourceClientOptions) {
    if (!options.apiKey.trim()) {
      throw new ExternalServiceError("LINGROOT_TOPIC_API_KEY is required.");
    }
    this.url = buildUrl(
      options.baseUrl,
      options.endpoint ?? "/internal/video-topic-brief",
    );
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxAttempts = options.maxAttempts ?? 3;
    if (this.timeoutMs <= 0 || this.maxAttempts < 1) {
      throw new ExternalServiceError(
        "LingRoot topic retry and timeout settings must be positive.",
      );
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep =
      options.sleep ??
      ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  async getTopicBrief(params: GetTopicBriefParams): Promise<TopicBrief> {
    if (!params.topic?.trim() && !params.topicId?.trim()) {
      throw new ExternalServiceError(
        "LingRoot topic request requires topic or topicId.",
      );
    }
    if (!Number.isInteger(params.sceneCount) || params.sceneCount < 1) {
      throw new ExternalServiceError(
        "LingRoot topic request sceneCount must be positive.",
      );
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(this.url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            schema_version: 1,
            topic: params.topic?.trim(),
            topic_id: params.topicId?.trim(),
            scene_count: params.sceneCount,
            language: params.language ?? "en",
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new ExternalServiceError(
            `LingRoot topic request failed with HTTP ${response.status}.`,
            {
              statusCode: response.status,
              retryable: RETRYABLE_STATUS_CODES.has(response.status),
            },
          );
        }
        let raw: unknown;
        try {
          raw = await response.json();
        } catch {
          throw new ExternalServiceError("LingRoot topic API returned invalid JSON.");
        }
        let brief: TopicBrief;
        try {
          brief = assertValid("topic-brief", raw);
        } catch (error) {
          if (error instanceof ValidationError) {
            throw new ExternalServiceError(
              "LingRoot topic response does not match the versioned contract.",
            );
          }
          throw error;
        }
        validateOutline(brief, params.sceneCount);
        return brief;
      } catch (error) {
        lastError = error;
        const retryable =
          error instanceof ExternalServiceError
            ? error.retryable
            : error instanceof Error &&
              (error.name === "AbortError" || error instanceof TypeError);
        if (!retryable || attempt === this.maxAttempts) throw error;
        await this.sleep(Math.min(250 * 2 ** (attempt - 1), 2_000));
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError;
  }
}
