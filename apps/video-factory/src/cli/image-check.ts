import { createImageClient } from "../adapters/index.js";
import {
  assertValid,
  getConfig,
  getLogger,
  makeRunId,
  slugify,
  writeBinary,
  writeJson,
  validateImageSize,
} from "../core/index.js";
import type {
  ImageOutputFormat,
  ImageQuality,
} from "../core/types.js";
import { planVisualScenes } from "../services/index.js";
import { parseArgs } from "./args.js";

function imageQuality(value: string | boolean | undefined): ImageQuality | undefined {
  if (typeof value !== "string") return undefined;
  if (!["low", "medium", "high", "auto"].includes(value)) {
    throw new Error("--quality must be low, medium, high or auto.");
  }
  return value as ImageQuality;
}

function outputFormat(
  value: string | boolean | undefined,
): ImageOutputFormat | undefined {
  if (typeof value !== "string") return undefined;
  if (!["png", "jpeg", "webp"].includes(value)) {
    throw new Error("--format must be png, jpeg or webp.");
  }
  return value as ImageOutputFormat;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const topic =
    typeof args.topic === "string"
      ? args.topic
      : "Why do people forget new words?";
  const config = getConfig();
  const client = createImageClient(config, { forceOpenAi: true });
  const topicId =
    slugify(topic).slice(0, 80).replace(/-+$/, "") || "topic";
  const scene = planVisualScenes({
    topicId,
    topic,
    sceneCount: 1,
  }).scenes[0];
  const request = assertValid("image-generation-request", {
    schemaVersion: 1,
    topicId,
    sceneId: scene.sceneId,
    prompt:
      typeof args.prompt === "string" ? args.prompt : scene.imagePrompt,
    size: typeof args.size === "string" ? args.size : config.image.size,
    quality: imageQuality(args.quality) ?? config.image.quality,
    outputFormat: outputFormat(args.format) ?? config.image.outputFormat,
    moderation: "auto",
  });
  validateImageSize(request.size);
  const result = await client.generateImage(request);
  const runId = makeRunId(`image-check-${topicId}`);
  const outputDir = `outputs/image-checks/${runId}`;
  const imagePath = `${outputDir}/${scene.sceneId}.${result.metadata.extension}`;
  await writeBinary(imagePath, result.bytes);
  await writeJson(`${outputDir}/request.json`, request);
  await writeJson(`${outputDir}/result.json`, {
    ...result.metadata,
    imagePath,
  });

  getLogger("image-check").info("OpenAI image check passed.", {
    provider: result.metadata.provider,
    model: result.metadata.model,
    requestId: result.metadata.requestId,
    imagePath,
    bytes: result.metadata.bytes,
    size: result.metadata.size,
    quality: result.metadata.quality,
  });
}

main().catch((error: unknown) => {
  getLogger("image-check").error(
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
