/**
 * Abstraction over the video render engine. Takes a fully-composed
 * {@link RenderPayload} (shared manifest + one level's audio/subtitle/badge)
 * and returns the render outcome for that single level.
 */

import type { CefrLevel, RenderPayload } from "../core/types.js";

export type RenderStatus = "done" | "failed" | "skipped";

export interface RenderResult {
  level: CefrLevel;
  render_status: RenderStatus;
  provider?: string;
  project_id?: string | null;
  video_url?: string | null;
  local_video_path?: string | null;
  duration_seconds: number;
  /** e.g. "1080x1920". */
  resolution: string;
  bytes?: number | null;
  rendering_time_seconds?: number | null;
}

export interface RenderClient {
  render(payload: RenderPayload): Promise<RenderResult>;
}

/** Optional capability used by durable production runs to survive polling restarts. */
export interface ResumableRenderClient extends RenderClient {
  submitRender(payload: RenderPayload): Promise<string>;
  completeRender(projectId: string, payload: RenderPayload): Promise<RenderResult>;
}

export function isResumableRenderClient(
  client: RenderClient,
): client is ResumableRenderClient {
  return (
    "submitRender" in client &&
    typeof (client as Partial<ResumableRenderClient>).submitRender === "function" &&
    typeof (client as Partial<ResumableRenderClient>).completeRender === "function"
  );
}
