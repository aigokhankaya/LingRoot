import {
  assertValid,
  makeRunId,
  slugify,
  writeBinary,
  writeJson,
  writeText,
} from "../core/index.js";
import type {
  CefrLevel,
  IntegrationCheckReport,
  RenderPayload,
  VisualScenes,
} from "../core/types.js";
import type {
  ImageClient,
  LingRootCoreClient,
  RenderClient,
  StorageClient,
} from "../services/index.js";
import {
  buildInstagramMetadata,
  buildYouTubeMetadata,
  planVisualScenes,
} from "../services/index.js";

function subtitleTime(ms: number, decimal = ","): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${[hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":")}${decimal}${String(millis).padStart(3, "0")}`;
}

function subtitleFile(
  cues: Array<{ text: string; startMs: number; endMs: number }>,
  format: "srt" | "vtt",
): string {
  const decimal = format === "srt" ? "," : ".";
  const body = cues
    .map(
      (cue, index) =>
        `${index + 1}\n${subtitleTime(cue.startMs, decimal)} --> ${subtitleTime(
          cue.endMs,
          decimal,
        )}\n${cue.text}\n`,
    )
    .join("\n");
  return format === "vtt" ? `WEBVTT\n\n${body}` : body;
}

export interface SingleLevelIntegrationCheckOptions {
  topic: string;
  level: CefrLevel;
  sceneCount: number;
  durationSeconds: number;
  signedUrlExpiresInSeconds: number;
  outputRoot?: string;
  imageSize: string;
  imageQuality: "low" | "medium" | "high" | "auto";
  imageOutputFormat: "png" | "jpeg" | "webp";
  voiceProfile: string;
  imageClient: ImageClient;
  coreClient: LingRootCoreClient;
  storageClient: StorageClient;
  renderClient: RenderClient;
}

export interface MultiLevelIntegrationCheckOptions
  extends Omit<SingleLevelIntegrationCheckOptions, "level"> {
  levels: CefrLevel[];
}

export async function runMultiLevelIntegrationCheck(
  options: MultiLevelIntegrationCheckOptions,
) {
  if (
    options.levels.length === 0 ||
    new Set(options.levels).size !== options.levels.length
  ) {
    throw new Error("Integration levels must be non-empty and unique.");
  }
  const topicId =
    slugify(options.topic).slice(0, 80).replace(/-+$/, "") || "topic";
  const runId = makeRunId(
    `integration-${topicId}-${options.levels.join("-").toLowerCase()}`,
  );
  const outputDir = `${options.outputRoot ?? "outputs/integration-checks"}/${runId}`;
  const visualScenes = planVisualScenes({
    topicId,
    topic: options.topic,
    sceneCount: options.sceneCount,
  });
  const durationPerScene =
    options.durationSeconds / visualScenes.scenes.length;
  const uploadedKeys: string[] = [];
  const safeManifest = structuredClone(visualScenes) as VisualScenes;

  try {
    for (const [index, scene] of visualScenes.scenes.entries()) {
      const generated = await options.imageClient.generateImage({
        schemaVersion: 1,
        topicId,
        sceneId: scene.sceneId,
        prompt: scene.imagePrompt,
        size: options.imageSize,
        quality: options.imageQuality,
        outputFormat: options.imageOutputFormat,
        moderation: "auto",
      });
      const fileName = `scene-${String(index + 1).padStart(2, "0")}.${generated.metadata.extension}`;
      const localPath = `${outputDir}/common/images/${fileName}`;
      await writeBinary(localPath, generated.bytes);
      const storageKey = `integration-checks/${runId}/common/images/${fileName}`;
      const stored = await options.storageClient.store(
        storageKey,
        generated.bytes,
        {
          contentType: generated.metadata.contentType,
          cacheControl: "3600",
          upsert: false,
        },
      );
      uploadedKeys.push(storageKey);
      const signedUrl = await options.storageClient.createSignedReadUrl(
        storageKey,
        options.signedUrlExpiresInSeconds,
      );
      scene.imageRef = signedUrl;
      scene.imageProvenance = generated.metadata;
      scene.durationSeconds = durationPerScene;

      safeManifest.scenes[index].imageRef = stored.path;
      safeManifest.scenes[index].imageProvenance = generated.metadata;
      safeManifest.scenes[index].durationSeconds = durationPerScene;
    }

    await writeJson(`${outputDir}/common/visual-scenes.json`, safeManifest);
    const results = [];
    for (const level of options.levels) {
      const levelPackage = await options.coreClient.getLevelPackage({
        topicId,
        topic: options.topic,
        coreMessage: options.topic,
        level,
        durationSeconds: options.durationSeconds,
        visualScenes,
        language: "en",
        voiceProfile: options.voiceProfile,
      });
      assertValid("level-package", levelPackage);
      if (!levelPackage.audio.ref || !levelPackage.subtitle.ref) {
        throw new Error(
          `LingRoot Core integration check requires audio and subtitle URLs for ${level}.`,
        );
      }
      const renderPayload: RenderPayload = {
        schemaVersion: 1,
        topicId,
        level,
        visualScenes,
        audio: {
          ref: levelPackage.audio.ref,
          durationSeconds: levelPackage.audio.durationSeconds,
        },
        subtitle: {
          ref: levelPackage.subtitle.ref,
          format: levelPackage.subtitle.format,
        },
        levelBadge: levelPackage.levelBadge,
        videoFormat: {
          width: 1080,
          height: 1920,
          fps: 30,
          durationSeconds: options.durationSeconds,
        },
        outputPath: `${outputDir}/levels/${level}/video.mp4`,
      };
      assertValid("render-payload", renderPayload);
      const result = await options.renderClient.render(renderPayload);
      results.push(result);

      const safeLevelPackage = structuredClone(levelPackage);
      safeLevelPackage.audio.ref = null;
      safeLevelPackage.subtitle.ref = null;
      const youtube = buildYouTubeMetadata(options.topic, level);
      const instagram = buildInstagramMetadata(level);
      assertValid("youtube-metadata", youtube);
      assertValid("instagram-metadata", instagram);
      const safeRenderPayload: RenderPayload = {
        ...renderPayload,
        visualScenes: safeManifest,
        audio: {
          ...renderPayload.audio,
          ref: null,
        },
        subtitle: {
          ...renderPayload.subtitle,
          ref: null,
        },
      };
      assertValid("render-payload", safeRenderPayload);
      await writeJson(
        `${outputDir}/levels/${level}/level-package.json`,
        safeLevelPackage,
      );
      await writeText(
        `${outputDir}/levels/${level}/script.txt`,
        `${levelPackage.script.lines.map((line) => line.text).join("\n")}\n`,
      );
      await writeText(
        `${outputDir}/levels/${level}/subtitles.srt`,
        subtitleFile(levelPackage.subtitle.cues, "srt"),
      );
      await writeText(
        `${outputDir}/levels/${level}/subtitles.vtt`,
        subtitleFile(levelPackage.subtitle.cues, "vtt"),
      );
      await writeJson(
        `${outputDir}/levels/${level}/render-payload.json`,
        safeRenderPayload,
      );
      await writeJson(
        `${outputDir}/levels/${level}/youtube-metadata.json`,
        youtube,
      );
      await writeJson(
        `${outputDir}/levels/${level}/instagram-metadata.json`,
        instagram,
      );
      await writeJson(`${outputDir}/levels/${level}/render-result.json`, {
        provider: result.provider,
        projectId: result.project_id,
        localVideoPath: result.local_video_path,
        durationSeconds: result.duration_seconds,
        resolution: result.resolution,
        bytes: result.bytes,
        renderingTimeSeconds: result.rendering_time_seconds,
      });
    }
    const report: IntegrationCheckReport = {
      schemaVersion: 1,
      runId,
      topicId,
      levels: options.levels,
      sceneCount: visualScenes.scenes.length,
      storageObjects: safeManifest.scenes.map(
        (scene) => scene.imageRef as string,
      ),
      renders: results.map((result) => ({
        level: result.level,
        provider: result.provider,
        projectId: result.project_id,
        localVideoPath: result.local_video_path,
        durationSeconds: result.duration_seconds,
        resolution: result.resolution,
        bytes: result.bytes,
        renderingTimeSeconds: result.rendering_time_seconds,
      })),
      secretsPersisted: false,
    };
    assertValid("integration-check-report", report);
    await writeJson(`${outputDir}/summary.json`, report);
    return { runId, outputDir, results };
  } finally {
    await Promise.allSettled(
      uploadedKeys.map((key) => options.storageClient.remove(key)),
    );
  }
}

export async function runSingleLevelIntegrationCheck(
  options: SingleLevelIntegrationCheckOptions,
) {
  const completed = await runMultiLevelIntegrationCheck({
    ...options,
    levels: [options.level],
  });
  return {
    runId: completed.runId,
    outputDir: completed.outputDir,
    result: completed.results[0],
  };
}
