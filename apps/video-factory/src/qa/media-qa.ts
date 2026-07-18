import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { getConfig } from "../core/config.js";
import type { LevelPackage, QaCheck } from "../core/types.js";

const execFileAsync = promisify(execFile);

interface FfprobeResult {
  format?: { duration?: string };
  streams?: Array<{
    codec_type?: string;
    codec_name?: string;
    width?: number;
    height?: number;
  }>;
}

function check(
  checks: QaCheck[],
  id: string,
  passed: boolean,
  message: string,
  level: LevelPackage["level"],
): void {
  checks.push({ id, passed, message, level, severity: "error" });
}

export async function runMediaQa(
  levelPackages: LevelPackage[],
  videoPaths: Map<LevelPackage["level"], string>,
  options?: {
    width: number;
    height: number;
    minSeconds: number;
    maxSeconds: number;
  },
): Promise<QaCheck[]> {
  const checks: QaCheck[] = [];
  for (const levelPackage of levelPackages) {
    const level = levelPackage.level;
    const videoPath = videoPaths.get(level);
    if (!videoPath) {
      check(checks, "media-video-path", false, "Rendered video path is missing.", level);
      continue;
    }
    let metadata: FfprobeResult;
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_type,codec_name,width,height",
        "-of",
        "json",
        videoPath,
      ]);
      metadata = JSON.parse(stdout) as FfprobeResult;
    } catch {
      check(
        checks,
        "media-ffprobe",
        false,
        "ffprobe could not inspect the rendered MP4.",
        level,
      );
      continue;
    }
    const video = metadata.streams?.find((stream) => stream.codec_type === "video");
    const audio = metadata.streams?.find((stream) => stream.codec_type === "audio");
    const duration = Number(metadata.format?.duration);
    check(
      checks,
      "media-video-resolution",
      video?.width === (options?.width ?? 1080)
        && video?.height === (options?.height ?? 1920),
      `Video resolution is ${video?.width ?? "unknown"}x${video?.height ?? "unknown"}.`,
      level,
    );
    check(
      checks,
      "media-video-codec",
      video?.codec_name === "h264",
      `Video codec is ${video?.codec_name ?? "unknown"}.`,
      level,
    );
    check(
      checks,
      "media-audio-stream",
      audio !== undefined,
      audio ? "Video contains an audio stream." : "Video has no audio stream.",
      level,
    );
    check(
      checks,
      "media-audio-codec",
      audio?.codec_name === "aac",
      `Audio codec is ${audio?.codec_name ?? "unknown"}.`,
      level,
    );
    const configuredRange = getConfig().video;
    const minSeconds = options?.minSeconds ?? configuredRange.minSeconds;
    const maxSeconds = options?.maxSeconds ?? configuredRange.maxSeconds;
    check(
      checks,
      "media-duration-range",
      Number.isFinite(duration) && duration >= minSeconds && duration <= maxSeconds,
      `Video duration must be between ${minSeconds} and ${maxSeconds} seconds.`,
      level,
    );
    check(
      checks,
      "media-duration",
      Number.isFinite(duration) &&
        Math.abs(duration - levelPackage.audio.durationSeconds) <= 1.5,
      `Video duration is ${Number.isFinite(duration) ? duration.toFixed(2) : "unknown"} seconds.`,
      level,
    );
  }
  return checks;
}
