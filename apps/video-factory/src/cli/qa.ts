import { basename } from "node:path";

import {
  assertValid,
  latestDirectory,
  readJsonFile,
  writeJson,
} from "../core/index.js";
import type { TopicPackage } from "../core/types.js";
import { getLogger } from "../core/logger.js";
import { runPackageQa } from "../qa/index.js";
import { parseArgs } from "./args.js";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const explicit =
    typeof args.package === "string" ? args.package : undefined;
  const packageDir =
    explicit ??
    (await latestDirectory("outputs/topic-packages", "production-report.json"));
  if (!packageDir) {
    throw new Error("No generated topic package found. Run npm run dry-run first.");
  }

  const topicPackage = assertValid(
    "topic-package",
    await readJsonFile<TopicPackage>(`${packageDir}/topic-package.json`),
  );
  const report = await runPackageQa({
    packageDir,
    topicPackage,
    expectedLevels: topicPackage.levels.map((item) => item.level),
    runId: `manual-qa-${basename(packageDir)}`,
  });
  assertValid("qa-report", report);
  await writeJson(`${packageDir}/qa-report.json`, report);

  getLogger("qa").info("QA completed.", {
    packageDir,
    passed: report.passed,
    score: report.score,
    errors: report.summary?.errors ?? 0,
  });
  if (!report.passed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  getLogger("qa").error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
