import { ExternalServiceError, ValidationError } from "../core/errors.js";
import type {
  CefrLevel,
  LevelPackage,
  LingRootCoreApiResponse,
} from "../core/types.js";
import { assertValid } from "../core/validators.js";
import {
  buildLingRootCoreRequest,
  type GetLevelPackageParams,
  type LingRootCoreClient,
} from "../services/lingroot-core-client.js";
import { buildLevelTimeline } from "../services/level-timeline.js";

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface HttpLingRootCoreClientOptions {
  baseUrl: string;
  endpoint?: string;
  apiKey: string;
  timeoutMs?: number;
  maxAttempts?: number;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

function levelLabel(level: CefrLevel): string {
  const labels: Record<CefrLevel, string> = {
    A1: "Beginner",
    A2: "Elementary",
    B1: "Intermediate",
    B2: "Upper-Intermediate",
    C1: "Advanced",
    C2: "Proficiency",
  };
  return labels[level];
}

function buildUrl(baseUrl: string, endpoint: string): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new ExternalServiceError("LINGROOT_CORE_API_URL must be a valid URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new ExternalServiceError(
      "LingRoot Core API URL must use http or https.",
    );
  }
  return `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;
}

function validateSemanticResponse(
  response: LingRootCoreApiResponse,
  params: GetLevelPackageParams,
): void {
  if (response.topic_id !== params.topicId) {
    throw new ExternalServiceError(
      `LingRoot Core topic mismatch: expected ${params.topicId}, received ${response.topic_id}.`,
    );
  }
  if (response.level !== params.level) {
    throw new ExternalServiceError(
      `LingRoot Core level mismatch: expected ${params.level}, received ${response.level}.`,
    );
  }

  const expectedSceneIds = params.visualScenes.scenes.map(
    (scene) => scene.sceneId,
  );
  const scriptSceneIds = response.script_lines.map((line) => line.scene_id);
  if (JSON.stringify(scriptSceneIds) !== JSON.stringify(expectedSceneIds)) {
    throw new ExternalServiceError(
      "LingRoot Core script_lines must match the requested scene_ids in order.",
    );
  }

  const knownSceneIds = new Set(expectedSceneIds);
  const scenePositions = new Map(
    expectedSceneIds.map((sceneId, index) => [sceneId, index]),
  );
  const subtitleSceneIds = new Set<string>();
  let previousScenePosition = -1;
  let previousCueEnd = 0;
  for (const cue of response.subtitle_lines) {
    if (!knownSceneIds.has(cue.scene_id)) {
      throw new ExternalServiceError(
        `LingRoot Core subtitle references unknown scene "${cue.scene_id}".`,
      );
    }
    if (cue.end <= cue.start) {
      throw new ExternalServiceError(
        "LingRoot Core subtitle cue must end after it starts.",
      );
    }
    if (cue.end > response.duration_seconds + 0.25) {
      throw new ExternalServiceError(
        "LingRoot Core subtitle cue exceeds the reported audio duration.",
      );
    }
    const scenePosition = scenePositions.get(cue.scene_id) as number;
    if (scenePosition < previousScenePosition) {
      throw new ExternalServiceError(
        "LingRoot Core subtitle_lines must follow the requested scene order.",
      );
    }
    if (cue.start + 0.25 < previousCueEnd) {
      throw new ExternalServiceError(
        "LingRoot Core subtitle_lines must not overlap.",
      );
    }
    subtitleSceneIds.add(cue.scene_id);
    previousScenePosition = scenePosition;
    previousCueEnd = Math.max(previousCueEnd, cue.end);
  }
  if (expectedSceneIds.some((sceneId) => !subtitleSceneIds.has(sceneId))) {
    throw new ExternalServiceError(
      "LingRoot Core subtitle_lines must cover every requested scene.",
    );
  }
}

export class HttpLingRootCoreClient implements LingRootCoreClient {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(options: HttpLingRootCoreClientOptions) {
    if (!options.apiKey.trim()) {
      throw new ExternalServiceError("LINGROOT_CORE_API_KEY is required.");
    }
    this.url = buildUrl(
      options.baseUrl,
      options.endpoint ?? "/internal/video-level-package",
    );
    if ((options.timeoutMs ?? 30_000) <= 0) {
      throw new ExternalServiceError("LingRoot Core timeout must be positive.");
    }
    if ((options.maxAttempts ?? 3) < 1) {
      throw new ExternalServiceError(
        "LingRoot Core maxAttempts must be at least 1.",
      );
    }
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep =
      options.sleep ??
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  async getLevelPackage(params: GetLevelPackageParams): Promise<LevelPackage> {
    const request = assertValid(
      "lingroot-core-request",
      buildLingRootCoreRequest(params),
    );
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
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        if (!response.ok) {
          const retryable = RETRYABLE_STATUS_CODES.has(response.status);
          throw new ExternalServiceError(
            `LingRoot Core request failed with HTTP ${response.status}.`,
            { statusCode: response.status, retryable },
          );
        }

        let raw: unknown;
        try {
          raw = await response.json();
        } catch {
          throw new ExternalServiceError(
            "LingRoot Core returned invalid JSON.",
          );
        }

        let apiResponse: LingRootCoreApiResponse;
        try {
          apiResponse = assertValid("lingroot-core-response", raw);
        } catch (error) {
          if (error instanceof ValidationError) {
            throw new ExternalServiceError(
              "LingRoot Core response does not match the versioned contract.",
            );
          }
          throw error;
        }
        validateSemanticResponse(apiResponse, params);

        const cues = apiResponse.subtitle_lines.map((cue) => ({
          sceneId: cue.scene_id,
          text: cue.text,
          startMs: Math.round(cue.start * 1000),
          endMs: Math.round(cue.end * 1000),
        }));
        return {
          schemaVersion: 1,
          topicId: apiResponse.topic_id,
          level: apiResponse.level,
          script: {
            lines: apiResponse.script_lines.map((line) => ({
              sceneId: line.scene_id,
              text: line.text,
            })),
          },
          audio: {
            ref: apiResponse.audio_url,
            voice: apiResponse.voice_profile,
            durationSeconds: apiResponse.duration_seconds,
            speakingRate: apiResponse.speaking_rate,
          },
          subtitle: {
            ref: apiResponse.subtitle_url,
            format: "srt",
            cues,
          },
          timeline: buildLevelTimeline(
            params.visualScenes,
            cues,
            apiResponse.duration_seconds,
          ),
          levelBadge: {
            level: apiResponse.level,
            label: levelLabel(apiResponse.level),
          },
          metadata: {
            title: `${params.topic ?? params.coreMessage} — ${apiResponse.level}`,
            description: apiResponse.voiceover_script,
            language: params.language ?? "en",
            tags: ["lingroot", apiResponse.level.toLowerCase()],
          },
        };
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
