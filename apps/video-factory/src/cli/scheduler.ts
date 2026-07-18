import {
  getLogger,
  pathExists,
  readJsonFile,
  removeFileIfExists,
  writeText,
} from "../core/index.js";
import {
  buildLaunchdPlist,
  LAUNCHD_LABEL,
  parseSchedulerTime,
} from "../scheduler/index.js";
import { runProduction } from "../workflows/index.js";

interface SchedulerConfig {
  preferredTimes: string[];
  timezone: string;
}

const previewPath = `outputs/scheduler/${LAUNCHD_LABEL}.plist`;

async function buildPreview(): Promise<string> {
  const config = await readJsonFile<SchedulerConfig>("config/scheduler.json");
  const { hour, minute } = parseSchedulerTime(
    config.preferredTimes[0] ?? "09:00",
  );
  await writeText(previewPath, buildLaunchdPlist(hour, minute));
  return config.timezone;
}

async function main(): Promise<void> {
  const action = process.argv[2] ?? "test";
  const logger = getLogger("scheduler");

  if (action === "test") {
    const timezone = await buildPreview();
    const result = await runProduction({
      topic: "Scheduler smoke test",
      mode: "test-single-level",
      levels: ["A1"],
      sceneCount: 2,
    });
    logger.info("Scheduler smoke test passed.", {
      timezone,
      previewPath,
      packageDir: result.packageDir,
    });
    return;
  }

  if (action === "install") {
    const timezone = await buildPreview();
    logger.info("LaunchAgent preview generated; it has not been loaded.", {
      timezone,
      previewPath,
      target: `~/Library/LaunchAgents/${LAUNCHD_LABEL}.plist`,
    });
    return;
  }

  if (action === "uninstall") {
    const existed = await pathExists(previewPath);
    await removeFileIfExists(previewPath);
    logger.info("Scheduler preview removed.", { previewPath, existed });
    return;
  }

  throw new Error(`Unknown scheduler action: ${action}`);
}

main().catch((error: unknown) => {
  getLogger("scheduler").error(
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
