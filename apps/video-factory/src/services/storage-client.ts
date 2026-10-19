/**
 * Provider-neutral artifact storage boundary.
 */

export interface StoreOptions {
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
}

export interface StoredObject {
  provider: string;
  key: string;
  path: string;
  bytes: number;
  contentType: string;
  bucket?: string;
  etag?: string | null;
}

export interface StorageClient {
  store(
    key: string,
    data: string | Uint8Array,
    options?: StoreOptions,
  ): Promise<StoredObject>;
  retrieve(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  createSignedReadUrl(key: string, expiresInSeconds: number): Promise<string>;
}

export function normalizeStorageKey(key: string): string {
  const normalized = key.replaceAll("\\", "/").replace(/^\/+/, "");
  const segments = normalized.split("/");
  if (
    normalized.length === 0 ||
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === "..",
    )
  ) {
    throw new Error(`Invalid storage key: "${key}"`);
  }
  return normalized;
}
