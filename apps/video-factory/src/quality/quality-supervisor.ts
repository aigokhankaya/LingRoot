import type {
  QualityAssessment,
  QualityFinding,
  QualityRecommendation,
  QualityReport,
} from "../core/types.js";
import { assertValid } from "../core/validators.js";

const WEIGHTS = { content: 0.25, cefr: 0.20, visual: 0.20, av_sync: 0.20, platform: 0.15 } as const;

function bounded(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
}

function scoreFor(assessments: QualityAssessment[], type: QualityAssessment["agentType"]): number {
  return assessments.find((assessment) => assessment.agentType === type)?.score ?? 0;
}

function allFindings(assessments: QualityAssessment[]): QualityFinding[] {
  return assessments.flatMap((assessment) => assessment.findings);
}

export function superviseQuality(input: {
  qualityRunId: string;
  topicId: string;
  mode: "shadow" | "enforced";
  rubricVersion: string;
  hardGatePassed: boolean;
  assessments: QualityAssessment[];
}): QualityReport {
  const contentAssessment = input.assessments.find((item) => item.agentType === "content");
  const content = contentAssessment?.dimensionScores.content ?? contentAssessment?.score ?? 0;
  const cefr = contentAssessment?.dimensionScores.cefr ?? contentAssessment?.score ?? 0;
  const visual = scoreFor(input.assessments, "visual");
  const avSync = scoreFor(input.assessments, "av_sync");
  const platform = scoreFor(input.assessments, "platform");
  const overallScore = bounded(content * WEIGHTS.content + cefr * WEIGHTS.cefr + visual * WEIGHTS.visual + avSync * WEIGHTS.av_sync + platform * WEIGHTS.platform);
  const findings = allFindings(input.assessments);
  let recommendation: QualityRecommendation = "accept";
  if (!input.hardGatePassed || findings.some((finding) => finding.severity === "critical")) recommendation = "blocked";
  else if (overallScore < 70 || findings.some((finding) => finding.severity === "high")) recommendation = "repair_required";
  else if (overallScore < 85 || findings.some((finding) => finding.severity === "medium")) recommendation = "human_review";
  const supervisor: QualityAssessment = {
    schemaVersion: 1,
    agentType: "supervisor",
    scope: "package",
    level: null,
    sceneId: null,
    platform: null,
    score: overallScore,
    confidence: Math.round((input.assessments.reduce((sum, item) => sum + item.confidence, 0) / Math.max(1, input.assessments.length)) * 1000) / 1000,
    summary: `Policy supervisor recommends ${recommendation}. The supervisor cannot publish or start repairs.`,
    dimensionScores: { content, cefr, visual, av_sync: avSync, platform },
    findings: [],
    provider: "policy",
    model: "bounded-supervisor-v1",
    promptVersion: "supervisor-policy-v1",
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  };
  return assertValid("quality-report", {
    schemaVersion: 1,
    topicId: input.topicId,
    qualityRunId: input.qualityRunId,
    generatedAt: new Date().toISOString(),
    mode: input.mode,
    rubricVersion: input.rubricVersion,
    overallScore,
    recommendation,
    summary: `${findings.length} finding(s) across ${input.assessments.length} specialist assessment(s).`,
    dimensionScores: supervisor.dimensionScores,
    assessments: [...input.assessments, supervisor],
    hardGatePassed: input.hardGatePassed,
  });
}
