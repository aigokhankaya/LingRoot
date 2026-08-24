export type MediaPlatform = 'youtube' | 'instagram' | 'x' | 'tiktok';
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type MediaVoiceQuality = 'standard' | 'high';
export type MediaCampaignStatus =
  | 'draft' | 'queued' | 'planning' | 'generating_visuals' | 'generating_levels'
  | 'rendering' | 'qa' | 'quality_queued' | 'quality_review' | 'repair_required'
  | 'repairing' | 'human_review' | 'review_ready' | 'approved' | 'scheduled'
  | 'published' | 'failed' | 'cancelled';

export interface MediaTargetInput {
  platform: MediaPlatform;
  format: 'vertical_video' | 'horizontal_video';
  title?: string;
  caption?: string;
  hashtags?: string[];
  scheduledAt?: string | null;
  config?: Record<string, unknown>;
}

export interface MediaCampaignInput {
  name: string;
  topic: string;
  language: string;
  objective: 'education' | 'discovery' | 'engagement' | 'announcement';
  tone: 'educational' | 'warm' | 'professional' | 'energetic';
  cta?: string;
  visualStyle: string;
  voiceProfile: string;
  voiceQuality: MediaVoiceQuality;
  levels: CefrLevel[];
  sceneCount: number;
  targetDurationSeconds: number;
  subtitlesEnabled: boolean;
  humanApprovalRequired: boolean;
  targets: MediaTargetInput[];
}

export interface MediaCampaignTarget extends MediaTargetInput {
  id: string;
  campaignId: string;
  status: string;
  externalPostId?: string | null;
  externalUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaJob {
  id: string;
  status: string;
  stage: string;
  progress: number;
  attempt: number;
  maxAttempts: number;
  workerId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  updatedAt: string;
}

export interface MediaArtifact {
  id: string;
  targetId?: string | null;
  level?: string | null;
  kind: string;
  uri: string;
  contentType?: string | null;
  bytes?: number | null;
  durationSeconds?: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type QualityAgentType = 'content' | 'visual' | 'av_sync' | 'platform' | 'supervisor';
export type QualityRecommendation = 'accept' | 'human_review' | 'repair_required' | 'blocked';

export interface MediaQualityAssessment {
  id: string;
  qualityRunId: string;
  agentType: QualityAgentType;
  scope: string;
  level?: CefrLevel | null;
  sceneId?: string | null;
  platform?: MediaPlatform | null;
  score: number;
  confidence: number;
  summary: string;
  dimensionScores: Record<string, number>;
  provider: string;
  model: string;
  promptVersion: string;
  usage: Record<string, number>;
  createdAt: string;
}

export interface MediaQualityFinding {
  id: string;
  qualityRunId: string;
  assessmentId?: string | null;
  agentType: QualityAgentType;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  category: string;
  scope: string;
  level?: CefrLevel | null;
  sceneId?: string | null;
  platform?: MediaPlatform | null;
  artifactUri?: string | null;
  evidence: string;
  suggestedAction: string;
  autoFixable: boolean;
  status: 'open' | 'accepted' | 'dismissed' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export interface MediaQualityRun {
  id: string;
  campaignId: string;
  generationJobId?: string | null;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  mode: 'shadow' | 'enforced';
  stage: string;
  progress: number;
  rubricVersion: string;
  provider?: string | null;
  model?: string | null;
  overallScore?: number | null;
  recommendation?: QualityRecommendation | null;
  summary?: string | null;
  dimensionScores: Record<string, number>;
  usage: Record<string, number>;
  promptVersions: Record<string, string>;
  attempt: number;
  maxAttempts: number;
  workerId?: string | null;
  errorMessage?: string | null;
  assessments?: MediaQualityAssessment[];
  findings?: MediaQualityFinding[];
  createdAt: string;
  updatedAt: string;
}

export interface MediaCampaign extends Omit<MediaCampaignInput, 'targets'> {
  id: string;
  status: MediaCampaignStatus;
  currentStage: string;
  progress: number;
  reviewNotes?: string | null;
  errorMessage?: string | null;
  config: Record<string, unknown>;
  targets: MediaCampaignTarget[];
  jobs?: MediaJob[];
  artifacts?: MediaArtifact[];
  qualityRuns?: MediaQualityRun[];
  latestQualityRun?: MediaQualityRun | null;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
}

export interface MediaCampaignListResponse {
  data: MediaCampaign[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}
