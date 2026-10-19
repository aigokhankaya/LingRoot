import { ExternalServiceError, ValidationError } from "../core/errors.js";
import { validateImageSize } from "../core/config.js";
import type {
  ImageGenerationMetadata,
  ImageGenerationRequest,
  ImageOutputFormat,
} from "../core/types.js";
import { assertValid } from "../core/validators.js";
import type {
  GeneratedImage,
  ImageClient,
} from "../services/image-client.js";

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

interface OpenAiImageResponse {
  created?: number;
  data?: Array<{ b64_json?: string }>;
}

export interface OpenAiImageClientOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  maxAttempts?: number;
  organization?: string;
  project?: string;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

function buildUrl(baseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new ExternalServiceError(
      "OPENAI_API_BASE_URL must be a valid URL.",
    );
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new ExternalServiceError(
      "OpenAI API base URL must use http or https.",
    );
  }
  return `${baseUrl.replace(/\/+$/, "")}/images/generations`;
}

function outputInfo(format: ImageOutputFormat): {
  contentType: ImageGenerationMetadata["contentType"];
  extension: ImageGenerationMetadata["extension"];
} {
  if (format === "jpeg") {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (format === "webp") {
    return { contentType: "image/webp", extension: "webp" };
  }
  return { contentType: "image/png", extension: "png" };
}

function hasExpectedSignature(
  bytes: Uint8Array,
  format: ImageOutputFormat,
): boolean {
  if (format === "png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (format === "jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }
  return (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}

function decodeImage(value: unknown, format: ImageOutputFormat): Uint8Array {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value)
  ) {
    throw new ExternalServiceError(
      "OpenAI Image API returned invalid base64 image data.",
    );
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.byteLength === 0 || !hasExpectedSignature(bytes, format)) {
    throw new ExternalServiceError(
      `OpenAI Image API returned data that is not a valid ${format} image.`,
    );
  }
  return bytes;
}

export class OpenAiImageClient implements ImageClient {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly organization?: string;
  private readonly project?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(options: OpenAiImageClientOptions) {
    if (!options.apiKey.trim()) {
      throw new ExternalServiceError("OPENAI_API_KEY is required.");
    }
    if ((options.timeoutMs ?? 130_000) <= 0) {
      throw new ExternalServiceError("OpenAI image timeout must be positive.");
    }
    if ((options.maxAttempts ?? 3) < 1) {
      throw new ExternalServiceError(
        "OpenAI image maxAttempts must be at least 1.",
      );
    }
    this.url = buildUrl(
      options.baseUrl ?? "https://api.openai.com/v1",
    );
    this.apiKey = options.apiKey;
    this.model = options.model ?? "gpt-image-2";
    this.timeoutMs = options.timeoutMs ?? 130_000;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.organization = options.organization;
    this.project = options.project;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep =
      options.sleep ??
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  async generateImage(
    requestInput: ImageGenerationRequest,
  ): Promise<GeneratedImage> {
    let request: ImageGenerationRequest;
    try {
      request = assertValid("image-generation-request", requestInput);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ExternalServiceError(
          "Image generation request does not match the provider-neutral contract.",
        );
      }
      throw error;
    }
    validateImageSize(request.size);

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const headers: Record<string, string> = {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
          accept: "application/json",
        };
        if (this.organization) {
          headers["openai-organization"] = this.organization;
        }
        if (this.project) headers["openai-project"] = this.project;

        const response = await this.fetchImpl(this.url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: this.model,
            prompt: request.prompt,
            n: 1,
            size: request.size,
            quality: request.quality,
            output_format: request.outputFormat,
            moderation: request.moderation,
            background: "opaque",
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new ExternalServiceError(
            `OpenAI Image API request failed with HTTP ${response.status}.`,
            {
              statusCode: response.status,
              retryable: RETRYABLE_STATUS_CODES.has(response.status),
            },
          );
        }

        let raw: OpenAiImageResponse;
        try {
          raw = (await response.json()) as OpenAiImageResponse;
        } catch {
          throw new ExternalServiceError(
            "OpenAI Image API returned invalid JSON.",
          );
        }
        const bytes = decodeImage(
          raw.data?.[0]?.b64_json,
          request.outputFormat,
        );
        const format = outputInfo(request.outputFormat);
        const createdAt =
          typeof raw.created === "number"
            ? new Date(raw.created * 1000).toISOString()
            : new Date().toISOString();
        const metadata: ImageGenerationMetadata = {
          schemaVersion: 1,
          topicId: request.topicId,
          sceneId: request.sceneId,
          provider: "openai",
          model: this.model,
          requestId: response.headers.get("x-request-id"),
          createdAt,
          contentType: format.contentType,
          extension: format.extension,
          bytes: bytes.byteLength,
          size: request.size,
          quality: request.quality,
          moderation: "auto",
        };
        assertValid("image-generation-result", metadata);
        return { bytes, metadata };
      } catch (error) {
        const retryable =
          error instanceof ExternalServiceError
            ? error.retryable
            : error instanceof Error &&
              (error.name === "AbortError" || error instanceof TypeError);
        if (!retryable || attempt === this.maxAttempts) throw error;
        await this.sleep(Math.min(500 * 2 ** (attempt - 1), 4_000));
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new ExternalServiceError("OpenAI Image API request failed.");
  }
}
