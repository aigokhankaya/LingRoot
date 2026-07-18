import { getLogger } from "../core/logger.js";
import { runProductionPreflight } from "../services/index.js";
import { parseArgs } from "./args.js";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const renderOnly = args["render-only"] === true;
  const checks = await runProductionPreflight({ renderOnly });
  const failed = checks.filter((check) => !check.passed);
  getLogger("preflight").info("Production preflight completed.", {
    checks: checks.map((check) => ({ id: check.id, passed: check.passed })),
    failures: failed.length,
    mode: renderOnly ? "render-only" : "release",
  });
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  getLogger("preflight").error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
