import { getLogger } from "../core/logger.js";
import { runProduction } from "../workflows/index.js";
import { parseArgs, parseLevels, parseMode, parsePositiveInt } from "./args.js";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const logger = getLogger("generate");
  const result = await runProduction({
    topic: typeof args.topic === "string" ? args.topic : undefined,
    title: typeof args.title === "string" ? args.title : undefined,
    mode: parseMode(args.mode),
    levels: parseLevels(args.levels),
    sceneCount: parsePositiveInt("scenes", args.scenes),
  });
  logger.info("Production package generated.", {
    packageDir: result.packageDir,
    qaPassed: result.qaReport.passed,
    qaScore: result.qaReport.score,
  });
}

main().catch((error: unknown) => {
  const logger = getLogger("generate");
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
