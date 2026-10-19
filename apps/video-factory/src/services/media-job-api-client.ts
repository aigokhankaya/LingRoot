import { ExternalServiceError } from "../core/errors.js";

export interface MediaCampaignTarget {
  id: string;
  platform: "youtube" | "instagram" | "x" | "tiktok";
  format: string;
  title?: string | null;
  caption?: string | null;
  hashtags: string[];
  config: Record<string, unknown>;
}

export interface MediaCampaignJob {
  id: string;
  name: string;
  topic: string;
  levels: Array<"A1" | "A2" | "B1" | "B2" | "C1" | "C2">;
  sceneCount: number;
  targetDurationSeconds: number;
  voiceProfile: string;
  voiceQuality: "standard" | "high";
  visualStyle: string;
  objective: "education" | "discovery" | "engagement" | "announcement";
  tone: "educational" | "warm" | "professional" | "energetic";
  cta?: string | null;
  targets: MediaCampaignTarget[];
}

export interface ClaimedMediaJob {
  job_id: string;
  lease_token: string;
  lease_seconds: number;
  attempt: number;
  action: "generate" | "publish";
  payload: Record<string, unknown>;
  campaign: MediaCampaignJob;
}

export interface MediaArtifactInput {
  target_id?: string | null;
  level?: string | null;
  kind: string;
  uri: string;
  content_type?: string | null;
  bytes?: number | null;
  duration_seconds?: number | null;
  metadata?: Record<string, unknown>;
}

export class MediaJobApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: { baseUrl: string; apiKey: string }) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    if (!this.baseUrl || !this.apiKey) {
      throw new ExternalServiceError("Media worker API URL and key are required.");
    }
  }

  private async request<T>(path: string, body: unknown): Promise<T | null> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (response.status === 204) return null;
    if (!response.ok) {
      throw new ExternalServiceError(`Media worker API failed with HTTP ${response.status}.`);
    }
    return (await response.json()) as T;
  }

  claim(workerId: string): Promise<ClaimedMediaJob | null> {
    return this.request<ClaimedMediaJob>("/internal/media-jobs/claim", { worker_id: workerId });
  }

  async heartbeat(job: ClaimedMediaJob): Promise<void> {
    await this.request(`/internal/media-jobs/${job.job_id}/heartbeat`, { lease_token: job.lease_token });
  }

  async progress(job: ClaimedMediaJob, stage: string, progress: number): Promise<void> {
    await this.request(`/internal/media-jobs/${job.job_id}/progress`, {
      lease_token: job.lease_token,
      stage,
      progress,
    });
  }

  async complete(
    job: ClaimedMediaJob,
    result: Record<string, unknown>,
    artifacts: MediaArtifactInput[],
  ): Promise<void> {
    await this.request(`/internal/media-jobs/${job.job_id}/complete`, {
      lease_token: job.lease_token,
      result,
      artifacts,
    });
  }

  async fail(job: ClaimedMediaJob, error: unknown, retryable = true): Promise<void> {
    await this.request(`/internal/media-jobs/${job.job_id}/fail`, {
      lease_token: job.lease_token,
      error: error instanceof Error ? error.message : String(error),
      retryable,
    });
  }
}
