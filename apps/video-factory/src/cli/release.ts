import { getLogger } from "../core/logger.js";
import { releaseTopicProduction } from "../workflows/index.js";
import { parseArgs } from "./args.js";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const packageDir = typeof args.package === "string" ? args.package : "";
  if (!packageDir) throw new Error("--package is required.");
  const state = await releaseTopicProduction({ packageDir });
  getLogger("release").info("YouTube release completed.", {
    packageDir,
    runId: state.runId,
    releasedLevels: state.levels.map((item) => item.level),
    topicPlaylistId: state.topicPlaylistId,
  });
}

main().catch((error: unknown) => {
  getLogger("release").error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
