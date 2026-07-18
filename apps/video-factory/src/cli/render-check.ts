import { createRenderClient } from "../adapters/index.js";
import {
  assertValid,
  getConfig,
  getLogger,
  makeRunId,
  slugify,
  writeJson,
} from "../core/index.js";
import type { CefrLevel, RenderPayload } from "../core/types.js";
import {
  buildJson2VideoMovie,
  planVisualScenes,
} from "../services/index.js";
import { parseArgs, parseLevels, parsePositiveInt } from "./args.js";

function requiredUrl(
  args: Record<string, string | boolean>,
  key: string,
): string {
  const value = args[key];
  if (typeof value !== "string") {
    throw new Error(`--${key} is required.`);
  }
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`--${key} must be an HTTP(S) URL.`);
  }
  return value;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const topic =
    typeof args.topic === "string" ? args.topic : "Render integration check";
  const level: CefrLevel = parseLevels(args.levels)?.[0] ?? "A1";
  const duration = parsePositiveInt("duration", args.duration) ?? 5;
  const imageUrl = requiredUrl(args, "image-url");
  const audioUrl = requiredUrl(args, "audio-url");
  const subtitleUrl = requiredUrl(args, "subtitle-url");
  const topicId = slugify(topic).slice(0, 80).replace(/-+$/, "") || "topic";
  const runId = makeRunId(`render-check-${topicId}`);
  const outputDir = `outputs/render-checks/${runId}`;
  const scenes = planVisualScenes({ topicId, topic, sceneCount: 1 });
  scenes.scenes[0].imageRef = imageUrl;
  scenes.scenes[0].durationSeconds = duration;
  const payload: RenderPayload = {
    schemaVersion: 1,
    topicId,
    level,
    visualScenes: scenes,
    audio: { ref: audioUrl, durationSeconds: duration },
    subtitle: { ref: subtitleUrl, format: "srt" },
    levelBadge: { level, label: level },
    videoFormat: {
      width: 1080,
      height: 1920,
      fps: 30,
      durationSeconds: duration,
    },
    outputPath: `${outputDir}/video.mp4`,
  };
  assertValid("render-payload", payload);

  const config = getConfig();
  const client = createRenderClient(config, { forceJson2Video: true });
  await writeJson(`${outputDir}/render-payload.json`, payload);
  await writeJson(
    `${outputDir}/json2video-movie.json`,
    buildJson2VideoMovie(payload, config.render.quality),
  );
  const result = await client.render(payload);
  await writeJson(`${outputDir}/result.json`, result);

  getLogger("render-check").info("JSON2Video render check passed.", {
    projectId: result.project_id,
    videoUrl: result.video_url,
    localVideoPath: result.local_video_path,
    durationSeconds: result.duration_seconds,
    resolution: result.resolution,
  });
}

main().catch((error: unknown) => {
  getLogger("render-check").error(
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
