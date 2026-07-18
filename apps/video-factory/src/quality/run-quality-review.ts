import { getConfig } from "../core/config.js";
import type { QualityAssessment, QualityReport } from "../core/types.js";
import { writeJson } from "../core/file-system.js";
import { createQualityAgents } from "./quality-agent-factory.js";
import { loadQualityPackage } from "./quality-package-loader.js";
import { superviseQuality } from "./quality-supervisor.js";

export async function runQualityReview(input: {
  qualityRunId: string;
  packageDir: string;
  mode?: "shadow" | "enforced";
  onProgress?: (stage: string, progress: number) => Promise<void> | void;
}): Promise<QualityReport> {
  const config = getConfig();
  const context = await loadQualityPackage(input.qualityRunId, input.packageDir);
  const agents = createQualityAgents(config);
  const assessments: QualityAssessment[] = [];
  for (const [index, agent] of agents.entries()) {
    await input.onProgress?.(`quality_${agent.type}`, 10 + index * 20);
    assessments.push(await agent.evaluate(context));
  }
  await input.onProgress?.("quality_supervisor", 92);
  const hardGatePassed = !context.qaReport.checks.some((check) => !check.passed && check.severity === "error");
  const report = superviseQuality({
    qualityRunId: input.qualityRunId,
    topicId: context.topicPackage.topicId,
    mode: input.mode ?? config.quality.mode,
    rubricVersion: config.quality.rubricVersion,
    hardGatePassed,
    assessments,
  });
  await writeJson(`${input.packageDir}/agent-quality-report.json`, report);
  return report;
}
