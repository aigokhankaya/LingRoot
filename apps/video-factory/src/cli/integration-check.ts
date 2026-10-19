import {
  createImageClient,
  createLingRootCoreClient,
  createRenderClient,
  createStorageClient,
} from "../adapters/index.js";
import { getConfig, getLogger } from "../core/index.js";
import type { CefrLevel } from "../core/types.js";
import { runMultiLevelIntegrationCheck } from "../workflows/index.js";
import {
  parseArgs,
  parseLevels,
  parsePositiveInt,
} from "./args.js";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const config = getConfig();
  const topic =
    typeof args.topic === "string"
      ? args.topic
      : "Why do people forget new words?";
  const levels: CefrLevel[] = parseLevels(args.levels) ?? ["A1"];
  const sceneCount = parsePositiveInt("scenes", args.scenes) ?? 1;
  const duration = parsePositiveInt("duration", args.duration) ?? 15;
  const minimumExpiry =
    Math.ceil(config.render.pollTimeoutMs / 1000) * levels.length + 600;
  const configuredExpiry =
    parsePositiveInt("signed-url-expiry", args["signed-url-expiry"]) ??
    minimumExpiry;
  if (configuredExpiry < minimumExpiry) {
    throw new Error(
      `--signed-url-expiry must be at least ${minimumExpiry} seconds.`,
    );
  }

  const completed = await runMultiLevelIntegrationCheck({
    topic,
    levels,
    sceneCount,
    durationSeconds: duration,
    signedUrlExpiresInSeconds: configuredExpiry,
    imageSize: config.image.size,
    imageQuality: config.image.quality,
    imageOutputFormat: config.image.outputFormat,
    voiceProfile: config.lingrootCore.voiceProfile,
    imageClient: createImageClient(config, { forceOpenAi: true }),
    coreClient: createLingRootCoreClient(config, { forceHttp: true }),
    storageClient: createStorageClient(config, { forceSupabase: true }),
    renderClient: createRenderClient(config, { forceJson2Video: true }),
  });

  getLogger("integration-check").info(
    "Real multi-level integration check passed.",
    {
      runId: completed.runId,
      outputDir: completed.outputDir,
      levels,
      renderProjects: completed.results.map((result) => result.project_id),
      resolutions: completed.results.map((result) => result.resolution),
    },
  );
}

main().catch((error: unknown) => {
  getLogger("integration-check").error(
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
