import { describe, expect, it } from "vitest";
import type { QualityAssessment, QualityFinding } from "../core/types.js";
import { superviseQuality } from "./quality-supervisor.js";

function assessment(agentType: QualityAssessment["agentType"], score: number, findings: QualityFinding[] = []): QualityAssessment {
  return {
    schemaVersion: 1, agentType, scope: "package", level: null, sceneId: null, platform: null,
    score, confidence: 0.8, summary: `${agentType} assessment`,
    dimensionScores: agentType === "content" ? { content: score, cefr: score } : {}, findings,
    provider: "mock", model: "test", promptVersion: "v1",
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  };
}

const highFinding: QualityFinding = {
  severity: "high", category: "visual_relevance", scope: "scene", level: null,
  sceneId: "scene-01", platform: null, artifactUri: null,
  evidence: "The image does not represent the narrative beat.",
  suggestedAction: "regenerate_image", autoFixable: true,
};

describe("quality supervisor", () => {
  it("accepts a strong package without material findings", () => {
    const report = superviseQuality({
      qualityRunId: "quality-1", topicId: "topic-1", mode: "shadow", rubricVersion: "v1", hardGatePassed: true,
      assessments: [assessment("content", 92), assessment("visual", 92), assessment("av_sync", 92), assessment("platform", 92)],
    });
    expect(report.overallScore).toBe(92);
    expect(report.recommendation).toBe("accept");
    expect(report.assessments.at(-1)?.agentType).toBe("supervisor");
  });

  it("recommends repair for a high severity finding", () => {
    const report = superviseQuality({
      qualityRunId: "quality-2", topicId: "topic-1", mode: "shadow", rubricVersion: "v1", hardGatePassed: true,
      assessments: [assessment("content", 90), assessment("visual", 90, [highFinding]), assessment("av_sync", 90), assessment("platform", 90)],
    });
    expect(report.recommendation).toBe("repair_required");
  });

  it("blocks when deterministic QA fails", () => {
    const report = superviseQuality({
      qualityRunId: "quality-3", topicId: "topic-1", mode: "shadow", rubricVersion: "v1", hardGatePassed: false,
      assessments: [assessment("content", 99), assessment("visual", 99), assessment("av_sync", 99), assessment("platform", 99)],
    });
    expect(report.recommendation).toBe("blocked");
    expect(report.hardGatePassed).toBe(false);
  });
});
