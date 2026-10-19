/**
 * Local {@link StorageClient}. Writes artifacts to disk under the project root
 * and returns the absolute local path. This is a real (non-mock) adapter but
 * performs no network I/O — suitable for Phase 2.
 */

import type { StorageClient, StoredObject } from "../services/storage-client.js";
import type { StoreOptions } from "../services/storage-client.js";
import { normalizeStorageKey } from "../services/storage-client.js";
import { NotImplementedError } from "../core/errors.js";
import {
  readBinary,
  removeFileIfExists,
  writeBinary,
  writeText,
} from "../core/file-system.js";

export class LocalStorageClient implements StorageClient {
  async store(
    keyInput: string,
    data: string | Uint8Array,
    options: StoreOptions = {},
  ): Promise<StoredObject> {
    const key = normalizeStorageKey(keyInput);
    const path =
      typeof data === "string" ? await writeText(key, data) : await writeBinary(key, data);
    const bytes =
      typeof data === "string" ? new TextEncoder().encode(data).length : data.byteLength;
    return {
      provider: "local",
      key,
      path,
      bytes,
      contentType: options.contentType ?? "application/octet-stream",
    };
  }

  async retrieve(keyInput: string): Promise<Buffer> {
    const key = normalizeStorageKey(keyInput);
    return readBinary(key);
  }

  async remove(keyInput: string): Promise<void> {
    const key = normalizeStorageKey(keyInput);
    await removeFileIfExists(key);
  }

  async createSignedReadUrl(
    _key: string,
    _expiresInSeconds: number,
  ): Promise<string> {
    throw new NotImplementedError(
      "signed read URLs are unavailable for local storage",
    );
  }
}
