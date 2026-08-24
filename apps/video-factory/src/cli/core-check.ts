import { createLingRootCoreClient } from "../adapters/index.js";
import { assertValid, getConfig, getLogger, slugify } from "../core/index.js";
import type { CefrLevel } from "../core/types.js";
import { buildVisualScenes } from "../testing/fixtures.js";
import { parseArgs, parseLevels, parsePositiveInt } from "./args.js";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const topic =
    typeof args.topic === "string"
      ? args.topic
      : "Why do people forget new words?";
  const level: CefrLevel = parseLevels(args.levels)?.[0] ?? "A1";
  const sceneCount = parsePositiveInt("scenes", args.scenes) ?? 2;
  const duration = parsePositiveInt("duration", args.duration) ?? 45;
  const config = getConfig();
  const client = createLingRootCoreClient(config, { forceHttp: true });
  const topicId = slugify(topic).slice(0, 80).replace(/-+$/, "") || "topic";
  const visualScenes = buildVisualScenes(topicId, sceneCount);

  const levelPackage = await client.getLevelPackage({
    topicId,
    topic,
    coreMessage: topic,
    level,
    durationSeconds: duration,
    visualScenes,
    language: "en",
    voiceProfile: config.lingrootCore.voiceProfile,
  });
  assertValid("level-package", levelPackage);

  getLogger("core-check").info("LingRoot Core contract check passed.", {
    provider: "http",
    endpoint: config.lingrootCore.endpoint,
    topicId,
    level,
    sceneCount,
    durationSeconds: levelPackage.audio.durationSeconds,
  });
}

main().catch((error: unknown) => {
  getLogger("core-check").error(
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
