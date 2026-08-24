import { ExternalServiceError, ValidationError } from "../core/errors.js";
import { writeBinary } from "../core/file-system.js";
import type {
  Json2VideoStatusResponse,
  Json2VideoSubmitResponse,
  RenderPayload,
} from "../core/types.js";
import { assertValid } from "../core/validators.js";
import { buildJson2VideoMovie } from "../services/json2video-movie-builder.js";
import type {
  RenderClient,
  RenderResult,
} from "../services/render-client.js";

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

export interface Json2VideoRenderClientOptions {
  apiKey: string;
  baseUrl?: string;
  quality?: "low" | "medium" | "high";
  requestTimeoutMs?: number;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
  pollMaxAttempts?: number;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
}

function apiUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ExternalServiceError(
      "JSON2VIDEO_API_BASE_URL must be a valid URL.",
    );
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new ExternalServiceError(
      "JSON2VIDEO_API_BASE_URL must use http or https.",
    );
  }
  return value.replace(/\/+$/, "");
}

function isMp4(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 12) return false;
  for (let index = 4; index <= Math.min(28, bytes.byteLength - 4); index += 1) {
    if (
      bytes[index] === 0x66 &&
      bytes[index + 1] === 0x74 &&
      bytes[index + 2] === 0x79 &&
      bytes[index + 3] === 0x70
    ) {
      return true;
    }
  }
  return false;
}

export class Json2VideoRenderClient implements RenderClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly quality: "low" | "medium" | "high";
  private readonly requestTimeoutMs: number;
  private readonly pollIntervalMs: number;
  private readonly pollTimeoutMs: number;
  private readonly pollMaxAttempts: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly now: () => number;

  constructor(options: Json2VideoRenderClientOptions) {
    if (!options.apiKey.trim()) {
      throw new ExternalServiceError("JSON2VIDEO_API_KEY is required.");
    }
    const positiveOptions = [
      ["requestTimeoutMs", options.requestTimeoutMs ?? 30_000],
      ["pollIntervalMs", options.pollIntervalMs ?? 3_000],
      ["pollTimeoutMs", options.pollTimeoutMs ?? 600_000],
      ["pollMaxAttempts", options.pollMaxAttempts ?? 3],
    ] as const;
    for (const [name, value] of positiveOptions) {
      if (value <= 0) {
        throw new ExternalServiceError(`JSON2Video ${name} must be positive.`);
      }
    }
    this.baseUrl = apiUrl(
      options.baseUrl ?? "https://api.json2video.com/v2",
    );
    this.apiKey = options.apiKey;
    this.quality = options.quality ?? "high";
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
    this.pollIntervalMs = options.pollIntervalMs ?? 3_000;
    this.pollTimeoutMs = options.pollTimeoutMs ?? 600_000;
    this.pollMaxAttempts = options.pollMaxAttempts ?? 3;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep =
      options.sleep ??
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.now = options.now ?? Date.now;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { "x-api-key": this.apiKey, ...extra };
  }

  private async request(
    url: string,
    init: RequestInit,
    retry: boolean,
  ): Promise<Response> {
    const attempts = retry ? this.pollMaxAttempts : 1;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.requestTimeoutMs,
      );
      try {
        const response = await this.fetchImpl(url, {
          ...init,
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new ExternalServiceError(
            `JSON2Video request failed with HTTP ${response.status}.`,
            {
              statusCode: response.status,
              retryable:
                retry && RETRYABLE_STATUS_CODES.has(response.status),
            },
          );
        }
        return response;
      } catch (error) {
        const retryable =
          retry &&
          (error instanceof ExternalServiceError
            ? error.retryable
            : error instanceof Error &&
              (error.name === "AbortError" || error instanceof TypeError));
        if (!retryable || attempt === attempts) throw error;
        await this.sleep(Math.min(500 * 2 ** (attempt - 1), 4_000));
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new ExternalServiceError("JSON2Video request failed.");
  }

  private async json<T>(
    response: Response,
    schema:
      | "json2video-submit-response"
      | "json2video-status-response",
  ): Promise<T> {
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new ExternalServiceError("JSON2Video returned invalid JSON.");
    }
    try {
      return assertValid(schema, raw) as T;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ExternalServiceError(
          `JSON2Video response does not match ${schema}.`,
        );
      }
      throw error;
    }
  }

  async submitRender(payload: RenderPayload): Promise<string> {
    const movie = buildJson2VideoMovie(payload, this.quality);
    const response = await this.request(
      `${this.baseUrl}/movies`,
      {
        method: "POST",
        headers: this.headers({
          "content-type": "application/json",
          accept: "application/json",
        }),
        body: JSON.stringify(movie),
      },
      false,
    );
    const submitted = await this.json<Json2VideoSubmitResponse>(
      response,
      "json2video-submit-response",
    );
    return submitted.project;
  }

  private async poll(project: string): Promise<Json2VideoStatusResponse["movie"]> {
    const deadline = this.now() + this.pollTimeoutMs;
    while (this.now() <= deadline) {
      const response = await this.request(
        `${this.baseUrl}/movies?project=${encodeURIComponent(project)}&format=simple`,
        {
          method: "GET",
          headers: this.headers({ accept: "application/json" }),
        },
        true,
      );
      const status = await this.json<Json2VideoStatusResponse>(
        response,
        "json2video-status-response",
      );
      if (status.movie.project !== project) {
        throw new ExternalServiceError(
          "JSON2Video status returned a different project ID.",
        );
      }
      if (status.movie.status === "done") return status.movie;
      if (
        status.movie.status === "error" ||
        status.movie.status === "timeout"
      ) {
        throw new ExternalServiceError(
          `JSON2Video render ${status.movie.status}: ${status.movie.message ?? "unknown provider error"}`,
        );
      }
      await this.sleep(this.pollIntervalMs);
    }
    throw new ExternalServiceError(
      `JSON2Video polling exceeded ${this.pollTimeoutMs}ms.`,
    );
  }

  private async downloadVideo(url: string): Promise<Uint8Array> {
    const response = await this.request(
      url,
      { method: "GET", headers: { accept: "video/mp4" } },
      true,
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!isMp4(bytes)) {
      throw new ExternalServiceError(
        "JSON2Video result is not a valid MP4 file.",
      );
    }
    return bytes;
  }

  async completeRender(project: string, payload: RenderPayload): Promise<RenderResult> {
    const movie = await this.poll(project);
    if (!movie.url) {
      throw new ExternalServiceError(
        "JSON2Video completed without a video URL.",
      );
    }
    if (
      (movie.width !== undefined && movie.width !== payload.videoFormat.width) ||
      (movie.height !== undefined &&
        movie.height !== payload.videoFormat.height)
    ) {
      throw new ExternalServiceError(
        `JSON2Video resolution mismatch: expected ${payload.videoFormat.width}x${payload.videoFormat.height}, received ${movie.width}x${movie.height}.`,
      );
    }

    let localPath: string | null = null;
    let downloadedBytes: number | null = null;
    if (payload.outputPath) {
      const bytes = await this.downloadVideo(movie.url);
      localPath = await writeBinary(payload.outputPath, bytes);
      downloadedBytes = bytes.byteLength;
    }
    return {
      level: payload.level,
      render_status: "done",
      provider: "json2video",
      project_id: project,
      video_url: movie.url,
      local_video_path: localPath,
      duration_seconds:
        movie.duration ??
        payload.videoFormat.durationSeconds ??
        payload.visualScenes.scenes.reduce(
          (total, scene) => total + scene.durationSeconds,
          0,
        ),
      resolution: `${movie.width ?? 1080}x${movie.height ?? 1920}`,
      bytes: movie.size ?? downloadedBytes,
      rendering_time_seconds: movie.rendering_time ?? null,
    };
  }

  async render(payload: RenderPayload): Promise<RenderResult> {
    const project = await this.submitRender(payload);
    return this.completeRender(project, payload);
  }
}
