import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { getConfig } from "../core/config.js";

const execFileAsync = promisify(execFile);

export interface PreflightCheck {
  id: string;
  passed: boolean;
  message: string;
}

export interface ProductionPreflightOptions {
  renderOnly?: boolean;
}

export async function runProductionPreflight(
  options: ProductionPreflightOptions = {},
): Promise<PreflightCheck[]> {
  const config = getConfig();
  const checks: PreflightCheck[] = [];
  const expect = (id: string, passed: boolean, message: string) => {
    checks.push({ id, passed, message });
  };
  expect(
    "dry-run-disabled",
    !config.dryRun,
    config.dryRun
      ? "DRY_RUN=true; real production is intentionally disabled."
      : "DRY_RUN is disabled for real production.",
  );
  for (const [id, provider, expected] of [
    ["topic-provider", config.lingrootTopic.provider, "http"],
    ["core-provider", config.lingrootCore.provider, "http"],
    ["image-provider", config.image.provider, "openai"],
  ] as const) {
    expect(id, provider === expected, `${id} is ${provider}; expected ${expected}.`);
  }
  const json2VideoRender = config.render.provider === "json2video";
  const supportedRenderer =
    config.render.provider === "ffmpeg" || json2VideoRender;
  expect(
    "render-provider",
    supportedRenderer,
    `render-provider is ${config.render.provider}; expected ffmpeg (primary) or json2video (alternative).`,
  );
  expect(
    "storage-provider",
    json2VideoRender ? config.storage.provider === "supabase" : true,
    json2VideoRender
      ? `storage-provider is ${config.storage.provider}; expected supabase for signed JSON2Video assets.`
      : `storage-provider is ${config.storage.provider}; local storage is supported with FFmpeg.`,
  );
  for (const [id, value] of [
    ["topic-url", config.lingrootTopic.baseUrl],
    ["topic-key", config.lingrootTopic.apiKey],
    ["core-url", config.lingrootCore.baseUrl],
    ["core-key", config.lingrootCore.apiKey],
    ["image-key", config.image.apiKey],
  ] as const) {
    expect(id, value.trim().length > 0, `${id} is configured.`);
  }
  if (!options.renderOnly) {
    for (const [id, value] of [
      ["youtube-client-id", config.youtube.clientId],
      ["youtube-client-secret", config.youtube.clientSecret],
      ["youtube-refresh-token", config.youtube.refreshToken],
    ] as const) {
      expect(id, value.trim().length > 0, `${id} is configured.`);
    }
  }
  if (config.storage.provider === "supabase") {
    for (const [id, value] of [
      ["storage-url", config.storage.supabaseUrl],
      ["storage-key", config.storage.serviceRoleKey],
      ["storage-bucket", config.storage.bucket],
    ] as const) {
      expect(id, value.trim().length > 0, `${id} is configured.`);
    }
  }
  if (json2VideoRender) {
    expect(
      "render-key",
      config.render.apiKey.trim().length > 0,
      "render-key is configured.",
    );
  }
  try {
    await execFileAsync("ffprobe", ["-version"]);
    expect("ffprobe", true, "ffprobe is available for final MP4 QA.");
  } catch {
    expect("ffprobe", false, "ffprobe is required for final MP4 QA.");
  }
  if (config.render.provider === "ffmpeg") {
    try {
      const { stdout, stderr } = await execFileAsync(config.render.ffmpegPath, [
        "-filters",
      ]);
      const filters = `${stdout}\n${stderr}`;
      const supported = /\bsubtitles\b/.test(filters) && /\bdrawtext\b/.test(filters);
      expect(
        "ffmpeg-filters",
        supported,
        supported
          ? "ffmpeg supports subtitles and drawtext for local rendering."
          : "ffmpeg must include subtitles and drawtext filters for local rendering.",
      );
    } catch {
      expect(
        "ffmpeg-filters",
        false,
        `FFMPEG_PATH=${config.render.ffmpegPath} is unavailable or cannot list filters.`,
      );
    }
  }
  return checks;
}
