import { createStorageClient } from "../adapters/index.js";
import {
  getConfig,
  getLogger,
  makeRunId,
  writeJson,
} from "../core/index.js";

async function main(): Promise<void> {
  const config = getConfig();
  const storage = createStorageClient(config, { forceSupabase: true });
  const runId = makeRunId("storage-check");
  const key = `healthchecks/${runId}.txt`;
  const content = `LingRoot Video Factory storage check ${runId}\n`;
  let uploaded = false;

  try {
    const stored = await storage.store(key, content, {
      contentType: "text/plain; charset=utf-8",
      cacheControl: "60",
      upsert: true,
    });
    uploaded = true;
    const downloaded = await storage.retrieve(key);
    if (downloaded.toString("utf8") !== content) {
      throw new Error("Supabase Storage round-trip content mismatch.");
    }
    await storage.remove(key);
    uploaded = false;
    await writeJson(`outputs/storage-checks/${runId}.json`, {
      runId,
      provider: stored.provider,
      bucket: stored.bucket,
      key: stored.key,
      path: stored.path,
      bytes: stored.bytes,
      contentType: stored.contentType,
      etag: stored.etag,
      roundTripVerified: true,
      removed: true,
    });
    getLogger("storage-check").info(
      "Supabase Storage round-trip check passed.",
      {
        provider: stored.provider,
        bucket: stored.bucket,
        key: stored.key,
        bytes: stored.bytes,
      },
    );
  } finally {
    if (uploaded) await storage.remove(key);
  }
}

main().catch((error: unknown) => {
  getLogger("storage-check").error(
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
