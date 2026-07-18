import type {
  QualityAgentType,
  QualityAssessment,
  QualityFinding,
} from "../core/types.js";
import type { QualityAgent, QualityPackageContext } from "./quality-agent.js";

const agentDimensions: Record<Exclude<QualityAgentType, "supervisor">, string[]> = {
  content: ["content", "pedagogy", "cefr"],
  visual: ["relevance", "coherence", "composition"],
  av_sync: ["audio", "subtitle", "timing"],
  platform: ["metadata", "brand", "cta"],
};

export class MockQualityAgent implements QualityAgent {
  readonly type: Exclude<QualityAgentType, "supervisor">;

  constructor(type: Exclude<QualityAgentType, "supervisor">) {
    this.type = type;
  }

  async evaluate(context: QualityPackageContext): Promise<QualityAssessment> {
    const failed = context.qaReport.checks.filter((check) => !check.passed);
    const relevant = this.type === "av_sync"
      ? failed.filter((check) => check.id.startsWith("media-") || check.id.includes("subtitle"))
      : this.type === "content"
        ? failed.filter((check) => check.id.startsWith("cefr-"))
        : [];
    const visualMissing = this.type === "visual" && context.images.length !== context.topicPackage.visualScenes.scenes.length;
    const findings: QualityFinding[] = relevant.map((check) => ({
      severity: check.severity === "error" ? "high" : "medium",
      category: check.id,
      scope: check.level ? "level" : "package",
      level: check.level ?? null,
      sceneId: null,
      platform: null,
      artifactUri: null,
      evidence: check.message,
      suggestedAction: this.type === "content" ? "rewrite_script" : "request_human_review",
      autoFixable: false,
    }));
    if (visualMissing) findings.push({
      severity: "high", category: "visual_asset_missing", scope: "package", level: null,
      sceneId: null, platform: null, artifactUri: null,
      evidence: "One or more shared scene images could not be loaded for review.",
      suggestedAction: "regenerate_image", autoFixable: false,
    });
    const score = Math.max(0, 92 - findings.length * 18);
    return {
      schemaVersion: 1,
      agentType: this.type,
      scope: "package",
      level: null,
      sceneId: null,
      platform: null,
      score,
      confidence: this.type === "visual" && context.images.length === 0 ? 0.35 : 0.72,
      summary: findings.length ? `${findings.length} actionable quality finding(s).` : "No deterministic quality concern was found in shadow evaluation.",
      dimensionScores: Object.fromEntries(agentDimensions[this.type].map((dimension) => [dimension, score])),
      findings,
      provider: "mock",
      model: "deterministic-shadow-v1",
      promptVersion: `${this.type}-v1`,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }
}
