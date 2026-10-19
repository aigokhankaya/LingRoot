import { ExternalServiceError } from "../core/errors.js";
import type { QualityReport } from "../core/types.js";

export interface ClaimedQualityRun {
  schema_version: 1;
  quality_run_id: string;
  campaign_id: string;
  lease_token: string;
  lease_seconds: number;
  attempt: number;
  mode: "shadow" | "enforced";
  rubric_version: string;
  package_ref: string;
}

export class QualityJobApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: { baseUrl: string; apiKey: string }) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    if (!this.baseUrl || !this.apiKey) throw new ExternalServiceError("Quality worker API URL and key are required.");
  }

  private async request<T>(path: string, body: unknown): Promise<T | null> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status === 204) return null;
    if (!response.ok) throw new ExternalServiceError(`Quality worker API failed with HTTP ${response.status}.`);
    return await response.json() as T;
  }

  claim(workerId: string): Promise<ClaimedQualityRun | null> {
    return this.request<ClaimedQualityRun>("/internal/media-quality/claim", { worker_id: workerId });
  }

  async heartbeat(run: ClaimedQualityRun): Promise<void> {
    await this.request(`/internal/media-quality/${run.quality_run_id}/heartbeat`, { lease_token: run.lease_token });
  }

  async progress(run: ClaimedQualityRun, stage: string, progress: number): Promise<void> {
    await this.request(`/internal/media-quality/${run.quality_run_id}/progress`, { lease_token: run.lease_token, stage, progress });
  }

  async complete(run: ClaimedQualityRun, report: QualityReport): Promise<void> {
    await this.request(`/internal/media-quality/${run.quality_run_id}/complete`, { lease_token: run.lease_token, report });
  }

  async fail(run: ClaimedQualityRun, error: unknown, retryable = true): Promise<void> {
    await this.request(`/internal/media-quality/${run.quality_run_id}/fail`, {
      lease_token: run.lease_token,
      error: error instanceof Error ? error.message : String(error),
      retryable,
    });
  }
}
