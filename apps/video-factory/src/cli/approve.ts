import { getLogger } from "../core/logger.js";
import { approveTopicProduction } from "../workflows/index.js";
import { parseArgs } from "./args.js";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const packageDir = typeof args.package === "string" ? args.package : "";
  if (!packageDir) throw new Error("--package is required.");
  const state = await approveTopicProduction(packageDir);
  getLogger("approve").info("Production run approved for private release.", {
    packageDir,
    runId: state.runId,
    approvedAt: state.reviewApprovedAt,
  });
}

main().catch((error: unknown) => {
  getLogger("approve").error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
