import { getLogger } from "../core/logger.js";
import { runTopicProduction } from "../workflows/index.js";
import { parseArgs, parseLevels, parsePositiveInt } from "./args.js";
import type { ProductionFormat } from "../core/types.js";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const format = typeof args.format === "string" ? args.format : undefined;
  if (format !== undefined && format !== "short" && format !== "long") {
    throw new Error("--format must be short or long.");
  }
  const result = await runTopicProduction({
    topic: typeof args.topic === "string" ? args.topic : undefined,
    topicId: typeof args["topic-id"] === "string" ? args["topic-id"] : undefined,
    levels: parseLevels(args.levels),
    sceneCount: parsePositiveInt("scenes", args.scenes),
    durationSeconds: parsePositiveInt("duration", args.duration),
    productionFormat: format as ProductionFormat | undefined,
    voiceProfile: typeof args.voice === "string" ? args.voice : undefined,
    resumePackageDir: typeof args.resume === "string" ? args.resume : undefined,
    rerender: args.rerender === true,
  });
  getLogger("produce").info("Production run completed.", {
    packageDir: result.packageDir,
    runId: result.runState.runId,
    stage: result.runState.stage,
    qaPassed: result.qaReport.passed,
  });
}

main().catch((error: unknown) => {
  getLogger("produce").error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
