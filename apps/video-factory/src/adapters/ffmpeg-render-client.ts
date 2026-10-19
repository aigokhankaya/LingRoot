/**
 * Local FFmpeg renderer. It composes the shared image sequence, one level's
 * local audio and SRT subtitles into a vertical MP4 without a render API.
 */

import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

import { ensureDir, resolvePath } from "../core/file-system.js";
import { ExternalServiceError } from "../core/errors.js";
import type { RenderPayload } from "../core/types.js";
import { assertValid } from "../core/validators.js";
import type { RenderClient, RenderResult } from "../services/render-client.js";

const execFileAsync = promisify(execFile);

type FfmpegExecutor = (command: string, args: string[]) => Promise<void>;

export interface FfmpegRenderClientOptions {
  ffmpegPath?: string;
  crf?: number;
  preset?: string;
  execute?: FfmpegExecutor;
  now?: () => number;
}

function filterValue(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(":", "\\:")
    .replaceAll("'", "\\'")
    .replaceAll(",", "\\,")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]");
}

function localAssetPath(reference: string | null | undefined, label: string): string {
  if (!reference) {
    throw new ExternalServiceError(`${label} local file path is required for FFmpeg.`);
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(reference)) {
    throw new ExternalServiceError(`${label} must be a local file path for FFmpeg.`);
  }
  return resolvePath(reference);
}

async function requireFile(path: string, label: string): Promise<void> {
  try {
    if (!(await stat(path)).isFile()) throw new Error("not a file");
  } catch {
    throw new ExternalServiceError(`${label} does not exist as a local file.`);
  }
}

function sceneDurations(payload: RenderPayload): Array<{ sceneId: string; duration: number }> {
  const ordered = [...payload.visualScenes.scenes].sort(
    (left, right) => left.order - right.order,
  );
  if (
    ordered.some((scene, index) => scene.order !== index) ||
    new Set(ordered.map((scene) => scene.sceneId)).size !== ordered.length
  ) {
    throw new ExternalServiceError(
      "Render visual scenes must have unique contiguous order.",
    );
  }
  if (
    payload.timeline &&
    (payload.timeline.scenes.length !== ordered.length ||
      payload.timeline.scenes.some(
        (scene, index) => scene.sceneId !== ordered[index]?.sceneId,
      ))
  ) {
    throw new ExternalServiceError(
      "Render timeline must reference the shared scene order exactly.",
    );
  }
  const durationByScene = new Map(
    payload.timeline?.scenes.map((scene) => [
      scene.sceneId,
      (scene.endMs - scene.startMs) / 1_000,
    ]) ?? [],
  );
  return ordered.map((scene) => {
    const duration = durationByScene.get(scene.sceneId) ?? scene.durationSeconds;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new ExternalServiceError(
        `Scene "${scene.sceneId}" must have a positive render duration.`,
      );
    }
    return { sceneId: scene.sceneId, duration };
  });
}

export class FfmpegRenderClient implements RenderClient {
  private readonly ffmpegPath: string;
  private readonly crf: number;
  private readonly preset: string;
  private readonly execute: FfmpegExecutor;
  private readonly now: () => number;

  constructor(options: FfmpegRenderClientOptions = {}) {
    this.ffmpegPath = options.ffmpegPath?.trim() || "ffmpeg";
    this.crf = options.crf ?? 20;
    this.preset = options.preset?.trim() || "medium";
    if (!Number.isInteger(this.crf) || this.crf < 0 || this.crf > 51) {
      throw new ExternalServiceError("FFmpeg CRF must be an integer between 0 and 51.");
    }
    this.execute =
      options.execute ??
      (async (command, args) => {
        await execFileAsync(command, args, { maxBuffer: 8 * 1024 * 1024 });
      });
    this.now = options.now ?? Date.now;
  }

  async render(payloadInput: RenderPayload): Promise<RenderResult> {
    const payload = assertValid("render-payload", payloadInput);
    const outputPath = payload.outputPath ?? `outputs/topic-packages/${payload.topicId}/${payload.level}.mp4`;
    const outputAbsolute = resolvePath(outputPath);
    const orderedScenes = [...payload.visualScenes.scenes].sort(
      (left, right) => left.order - right.order,
    );
    const durations = sceneDurations(payload);
    const imagePaths = await Promise.all(
      orderedScenes.map(async (scene) => {
        const path = localAssetPath(scene.imageRef, `${scene.sceneId} image`);
        await requireFile(path, `${scene.sceneId} image`);
        return path;
      }),
    );
    const audioPath = localAssetPath(payload.audio.ref, "Audio");
    const subtitlePath = localAssetPath(payload.subtitle.ref, "Subtitle");
    await Promise.all([
      requireFile(audioPath, "Audio"),
      requireFile(subtitlePath, "Subtitle"),
    ]);

    const { width, height, fps } = payload.videoFormat;
    if (!Number.isInteger(fps) || fps <= 0) {
      throw new ExternalServiceError("FFmpeg render requires a positive integer FPS.");
    }
    const inputArgs = imagePaths.flatMap((imagePath, index) => [
      "-loop",
      "1",
      "-framerate",
      String(fps),
      "-t",
      durations[index]!.duration.toFixed(3),
      "-i",
      imagePath,
    ]);
    const imageFilters = durations.map(({ duration }, index) => {
      const scaledWidth = Math.ceil(width * 1.08);
      const scaledHeight = Math.ceil(height * 1.08);
      const progress = `min(t/${duration.toFixed(3)}\\,1)`;
      const panX = index % 2 === 0
        ? `(iw-ow)*${progress}`
        : `(iw-ow)*(1-${progress})`;
      return `[${index}:v]scale=${scaledWidth}:${scaledHeight}:force_original_aspect_ratio=increase,crop=${width}:${height}:x='${panX}':y='(ih-oh)/2',setsar=1,fps=${fps},trim=duration=${duration.toFixed(3)},setpts=PTS-STARTPTS[scene${index}]`;
    });
    const concatInputs = durations.map((_, index) => `[scene${index}]`).join("");
    const subtitleStyle = width > height
      ? "FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=44"
      : "FontSize=15,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=32";
    const filter = [
      ...imageFilters,
      `${concatInputs}concat=n=${durations.length}:v=1:a=0[visual]`,
      `[visual]subtitles=filename='${filterValue(subtitlePath)}':force_style='${subtitleStyle}'[subtitled]`,
      `[subtitled]drawtext=text='${filterValue(payload.levelBadge.label)}':x=w-tw-48:y=48:fontsize=48:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=16[video]`,
    ].join(";");
    const audioInputIndex = imagePaths.length;
    const args = [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      ...inputArgs,
      "-i",
      audioPath,
      "-filter_complex",
      filter,
      "-map",
      "[video]",
      "-map",
      `${audioInputIndex}:a:0`,
      "-c:v",
      "libx264",
      "-preset",
      this.preset,
      "-crf",
      String(this.crf),
      "-pix_fmt",
      "yuv420p",
      "-r",
      String(fps),
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      "-movflags",
      "+faststart",
      outputAbsolute,
    ];

    await ensureDir(dirname(outputAbsolute));
    const startedAt = this.now();
    try {
      await this.execute(this.ffmpegPath, args);
    } catch {
      throw new ExternalServiceError("Local FFmpeg render failed.");
    }
    let outputSize: number;
    try {
      outputSize = (await stat(outputAbsolute)).size;
    } catch {
      throw new ExternalServiceError("FFmpeg completed without an MP4 output file.");
    }
    if (outputSize <= 0) {
      throw new ExternalServiceError("FFmpeg produced an empty MP4 output file.");
    }
    return {
      level: payload.level,
      render_status: "done",
      provider: "ffmpeg",
      project_id: null,
      video_url: null,
      local_video_path: outputPath,
      duration_seconds:
        payload.audio.durationSeconds ??
        durations.reduce((total, scene) => total + scene.duration, 0),
      resolution: `${width}x${height}`,
      bytes: outputSize,
      rendering_time_seconds: (this.now() - startedAt) / 1_000,
    };
  }
}
