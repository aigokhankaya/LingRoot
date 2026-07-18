import { ExternalServiceError } from "../core/errors.js";
import {
  normalizeStorageKey,
  type StorageClient,
  type StoredObject,
  type StoreOptions,
} from "../services/storage-client.js";

const RETRYABLE_STATUS_CODES = new Set([408, 423, 429, 500, 502, 503, 504]);

export interface SupabaseStorageClientOptions {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
  timeoutMs?: number;
  maxAttempts?: number;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

function storageBaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ExternalServiceError("SUPABASE_URL must be a valid URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new ExternalServiceError("SUPABASE_URL must use http or https.");
  }
  return `${value.replace(/\/+$/, "")}/storage/v1`;
}

function validateBucket(value: string): string {
  const bucket = value.trim();
  if (!bucket || bucket.includes("/") || bucket === "." || bucket === "..") {
    throw new ExternalServiceError("Supabase Storage bucket is invalid.");
  }
  return bucket;
}

function encodeKey(key: string): string {
  return normalizeStorageKey(key)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export class SupabaseStorageClient implements StorageClient {
  private readonly baseUrl: string;
  private readonly serviceRoleKey: string;
  private readonly bucket: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(options: SupabaseStorageClientOptions) {
    if (!options.serviceRoleKey.trim()) {
      throw new ExternalServiceError(
        "SUPABASE_SERVICE_ROLE_KEY is required.",
      );
    }
    if ((options.timeoutMs ?? 30_000) <= 0) {
      throw new ExternalServiceError(
        "Supabase Storage timeout must be positive.",
      );
    }
    if ((options.maxAttempts ?? 3) < 1) {
      throw new ExternalServiceError(
        "Supabase Storage maxAttempts must be at least 1.",
      );
    }
    this.baseUrl = storageBaseUrl(options.supabaseUrl);
    this.serviceRoleKey = options.serviceRoleKey;
    this.bucket = validateBucket(options.bucket);
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep =
      options.sleep ??
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      authorization: `Bearer ${this.serviceRoleKey}`,
      apikey: this.serviceRoleKey,
      ...extra,
    };
  }

  private async request(
    url: string,
    init: RequestInit,
    allowRetry: boolean,
  ): Promise<Response> {
    const attempts = allowRetry ? this.maxAttempts : 1;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(url, {
          ...init,
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new ExternalServiceError(
            `Supabase Storage request failed with HTTP ${response.status}.`,
            {
              statusCode: response.status,
              retryable:
                allowRetry && RETRYABLE_STATUS_CODES.has(response.status),
            },
          );
        }
        return response;
      } catch (error) {
        const retryable =
          allowRetry &&
          (error instanceof ExternalServiceError
            ? error.retryable
            : error instanceof Error &&
              (error.name === "AbortError" || error instanceof TypeError));
        if (!retryable || attempt === attempts) throw error;
        await this.sleep(Math.min(250 * 2 ** (attempt - 1), 2_000));
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new ExternalServiceError("Supabase Storage request failed.");
  }

  async store(
    keyInput: string,
    data: string | Uint8Array,
    options: StoreOptions = {},
  ): Promise<StoredObject> {
    const key = normalizeStorageKey(keyInput);
    const bytes =
      typeof data === "string" ? new TextEncoder().encode(data) : data;
    const contentType = options.contentType ?? "application/octet-stream";
    const upsert = options.upsert ?? false;
    const response = await this.request(
      `${this.baseUrl}/object/${encodeURIComponent(this.bucket)}/${encodeKey(key)}`,
      {
        method: "POST",
        headers: this.headers({
          "content-type": contentType,
          "cache-control": `max-age=${options.cacheControl ?? "3600"}`,
          "x-upsert": String(upsert),
        }),
        body: Buffer.from(bytes),
      },
      upsert,
    );
    return {
      provider: "supabase",
      bucket: this.bucket,
      key,
      path: `supabase://${this.bucket}/${key}`,
      bytes: bytes.byteLength,
      contentType,
      etag: response.headers.get("etag"),
    };
  }

  async retrieve(keyInput: string): Promise<Buffer> {
    const key = normalizeStorageKey(keyInput);
    const response = await this.request(
      `${this.baseUrl}/object/${encodeURIComponent(this.bucket)}/${encodeKey(key)}`,
      { method: "GET", headers: this.headers() },
      true,
    );
    return Buffer.from(await response.arrayBuffer());
  }

  async remove(keyInput: string): Promise<void> {
    const key = normalizeStorageKey(keyInput);
    await this.request(
      `${this.baseUrl}/object/${encodeURIComponent(this.bucket)}`,
      {
        method: "DELETE",
        headers: this.headers({ "content-type": "application/json" }),
        body: JSON.stringify({ prefixes: [key] }),
      },
      true,
    );
  }

  async createSignedReadUrl(
    keyInput: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const key = normalizeStorageKey(keyInput);
    if (!Number.isInteger(expiresInSeconds) || expiresInSeconds <= 0) {
      throw new ExternalServiceError(
        "Signed URL expiry must be a positive integer.",
      );
    }
    const response = await this.request(
      `${this.baseUrl}/object/sign/${encodeURIComponent(this.bucket)}/${encodeKey(key)}`,
      {
        method: "POST",
        headers: this.headers({ "content-type": "application/json" }),
        body: JSON.stringify({ expiresIn: expiresInSeconds }),
      },
      true,
    );
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new ExternalServiceError(
        "Supabase Storage returned invalid signed URL JSON.",
      );
    }
    const signedPath =
      raw && typeof raw === "object"
        ? ((raw as Record<string, unknown>).signedURL ??
          (raw as Record<string, unknown>).signedUrl)
        : undefined;
    if (typeof signedPath !== "string" || signedPath.length === 0) {
      throw new ExternalServiceError(
        "Supabase Storage response is missing signedURL.",
      );
    }
    const signedUrl = signedPath.startsWith("http")
      ? signedPath
      : `${this.baseUrl}${signedPath.startsWith("/") ? "" : "/"}${signedPath}`;
    const parsed = new URL(signedUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new ExternalServiceError(
        "Supabase Storage returned an invalid signed URL.",
      );
    }
    return signedUrl;
  }
}
