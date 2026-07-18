/**
 * Mock {@link RenderClient}. Reports a successful render and a placeholder local
 * path for each level. No actual video is produced (Phase 2 is mock-first).
 */

import type { RenderClient, RenderResult } from "../services/render-client.js";
import type { RenderPayload } from "../core/types.js";
import { writeBinaryPlaceholder } from "../core/file-system.js";

export class MockRenderClient implements RenderClient {
  async render(payload: RenderPayload): Promise<RenderResult> {
    const { width, height, durationSeconds } = payload.videoFormat;
    const fromScenes = payload.visualScenes.scenes.reduce(
      (sum, s) => sum + s.durationSeconds,
      0,
    );
    const localPath =
      payload.outputPath ??
      `outputs/topic-packages/${payload.topicId}/${payload.level}.mp4`;
    await writeBinaryPlaceholder(localPath, `mock-video-${payload.level}`);

    return {
      level: payload.level,
      render_status: "done",
      video_url: null,
      local_video_path: localPath,
      duration_seconds: durationSeconds ?? fromScenes,
      resolution: `${width}x${height}`,
    };
  }
}
