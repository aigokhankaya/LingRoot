import type { AppConfig } from "../core/config.js";
import { ConfigError } from "../core/errors.js";
import type { StorageClient } from "../services/storage-client.js";
import { LocalStorageClient } from "./local-storage-client.js";
import { SupabaseStorageClient } from "./supabase-storage-client.js";

export function createStorageClient(
  config: AppConfig,
  options: { forceSupabase?: boolean } = {},
): StorageClient {
  if (config.dryRun && !options.forceSupabase) {
    return new LocalStorageClient();
  }
  const provider = options.forceSupabase
    ? "supabase"
    : config.storage.provider;
  if (provider === "local") return new LocalStorageClient();
  if (!config.storage.supabaseUrl.trim()) {
    throw new ConfigError(
      "SUPABASE_URL is required when STORAGE_PROVIDER=supabase.",
    );
  }
  if (!config.storage.serviceRoleKey.trim()) {
    throw new ConfigError(
      "SUPABASE_SERVICE_ROLE_KEY is required when STORAGE_PROVIDER=supabase.",
    );
  }
  if (!config.storage.bucket.trim()) {
    throw new ConfigError(
      "SUPABASE_STORAGE_BUCKET is required when STORAGE_PROVIDER=supabase.",
    );
  }
  return new SupabaseStorageClient({
    supabaseUrl: config.storage.supabaseUrl,
    serviceRoleKey: config.storage.serviceRoleKey,
    bucket: config.storage.bucket,
    timeoutMs: config.storage.timeoutMs,
    maxAttempts: config.storage.maxAttempts,
  });
}
