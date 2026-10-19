import { createYouTubeClient } from "../adapters/index.js";
import {
  assertValid,
  getConfig,
  getLogger,
  makeRunId,
  readJsonFile,
  writeJson,
} from "../core/index.js";
import type { YouTubeMetadata } from "../core/types.js";
import { parseArgs } from "./args.js";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const videoPath =
    typeof args.video === "string" ? args.video : undefined;
  const metadataPath =
    typeof args.metadata === "string" ? args.metadata : undefined;
  if (!videoPath || !metadataPath) {
    throw new Error("--video and --metadata are required.");
  }
  const metadata = assertValid(
    "youtube-metadata",
    await readJsonFile<YouTubeMetadata>(metadataPath),
  );
  if (metadata.privacyStatus !== "private") {
    throw new Error(
      "youtube:check only accepts metadata with privacyStatus=private.",
    );
  }

  const result = await createYouTubeClient(getConfig()).uploadPrivateVideo(
    videoPath,
    metadata,
  );
  const runId = makeRunId(`youtube-check-${result.videoId}`);
  await writeJson(`outputs/youtube-checks/${runId}.json`, {
    runId,
    provider: result.provider,
    videoId: result.videoId,
    privacyStatus: result.privacyStatus,
    title: result.title,
  });
  getLogger("youtube-check").info("YouTube private upload passed.", {
    provider: result.provider,
    videoId: result.videoId,
    privacyStatus: result.privacyStatus,
    title: result.title,
  });
}

main().catch((error: unknown) => {
  getLogger("youtube-check").error(
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
