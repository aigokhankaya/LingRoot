import type {
  QualityAgentType,
  QualityAssessment,
  QaReport,
  TopicPackage,
} from "../core/types.js";

export interface QualityImageInput {
  sceneId: string;
  uri: string;
  imageUrl: string;
}

export interface QualityPackageContext {
  qualityRunId: string;
  packageDir: string;
  topicPackage: TopicPackage;
  qaReport: QaReport;
  socialMetadata: Record<string, unknown>;
  images: QualityImageInput[];
}

export interface QualityAgent {
  readonly type: Exclude<QualityAgentType, "supervisor">;
  evaluate(context: QualityPackageContext): Promise<QualityAssessment>;
}
