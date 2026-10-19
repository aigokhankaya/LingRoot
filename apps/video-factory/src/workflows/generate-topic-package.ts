import {
  createImageClient,
  createLingRootCoreClient,
  createRenderClient,
} from "../adapters/index.js";
import {
  assertValid,
  dateSlug,
  getConfig,
  makeRunId,
  slugify,
  writeBinary,
  writeBinaryPlaceholder,
  writeJson,
  writeText,
} from "../core/index.js";
import type {
  CefrLevel,
  GenerationMode,
  InstagramMetadata,
  ProductionReport,
  QaReport,
  RenderPayload,
  TopicPackage,
  YouTubeMetadata,
} from "../core/types.js";
import { ConfigError } from "../core/errors.js";
import { runPackageQa } from "../qa/index.js";
import {
  buildInstagramMetadata,
  buildYouTubeMetadata,
  planVisualScenes,
  type ImageClient,
  type LingRootCoreClient,
  type RenderClient,
} from "../services/index.js";

const ALL_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export interface ProductionOptions {
  topic?: string;
  title?: string;
  mode?: GenerationMode;
  levels?: CefrLevel[];
  sceneCount?: number;
  now?: Date;
  outputRoot?: string;
  coreClient?: LingRootCoreClient;
  imageClient?: ImageClient;
  renderClient?: RenderClient;
}

export interface ProductionResult {
  packageDir: string;
  topicPackage: TopicPackage;
  qaReport: QaReport;
  productionReport: ProductionReport;
}

function titleCaseTopic(topic: string): string {
  const trimmed = topic.trim().replace(/[?.!]+$/, "");
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function resolveMode(
  options: ProductionOptions,
): { levels: CefrLevel[]; sceneCount: number } {
  const mode = options.mode ?? "dry-run";
  if (mode === "test-single-level") {
    return { levels: [options.levels?.[0] ?? "A1"], sceneCount: options.sceneCount ?? 2 };
  }
  if (mode === "test-six-levels") {
    return { levels: ALL_LEVELS, sceneCount: options.sceneCount ?? 2 };
  }
  if (mode === "production") {
    return { levels: ALL_LEVELS, sceneCount: options.sceneCount ?? 6 };
  }
  return { levels: ALL_LEVELS, sceneCount: options.sceneCount ?? 3 };
}

function toSrt(cues: TopicPackage["levels"][number]["subtitle"]["cues"]): string {
  function time(ms: number): string {
    const hours = Math.floor(ms / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1000);
    const millis = ms % 1000;
    return [hours, minutes, seconds]
      .map((part) => String(part).padStart(2, "0"))
      .join(":") + `,${String(millis).padStart(3, "0")}`;
  }
  return cues
    .map(
      (cue, index) =>
        `${index + 1}\n${time(cue.startMs)} --> ${time(cue.endMs)}\n${cue.text}\n`,
    )
    .join("\n");
}

function toVtt(cues: TopicPackage["levels"][number]["subtitle"]["cues"]): string {
  return `WEBVTT\n\n${toSrt(cues).replaceAll(",", ".")}`;
}

function levelQaReport(report: QaReport, level: CefrLevel): QaReport {
  const checks = report.checks.filter(
    (item) => item.level === undefined || item.level === level,
  );
  const errors = checks.filter(
    (item) => !item.passed && item.severity === "error",
  ).length;
  const warnings = checks.filter(
    (item) => !item.passed && item.severity === "warn",
  ).length;
  return {
    ...report,
    passed: errors === 0,
    score:
      checks.length === 0
        ? 0
        : checks.filter((item) => item.passed).length / checks.length,
    checks,
    summary: { errors, warnings },
  };
}

export async function runProduction(
  options: ProductionOptions = {},
): Promise<ProductionResult> {
  const config = getConfig();
  if (!config.dryRun) {
    throw new ConfigError(
      "Full production still requires DRY_RUN=true until image, storage and render adapters are ready. Use npm run core:check for the Core API integration.",
    );
  }

  const topic = options.topic?.trim() || "Why do people forget new words?";
  const title = options.title?.trim() || titleCaseTopic(topic);
  const slug =
    slugify(topic).slice(0, 80).replace(/-+$/, "") || "topic";
  const now = options.now ?? new Date();
  const runId = makeRunId(slug, now);
  const { levels, sceneCount } = resolveMode(options);
  const outputRoot = options.outputRoot ?? "outputs/topic-packages";
  const packageDir = `${outputRoot}/${dateSlug(now, config.scheduler.timezone)}_${slug}`;
  const targetDuration = Math.min(
    Math.max(45, config.video.minSeconds),
    config.video.maxSeconds,
  );

  const imageClient = options.imageClient ?? createImageClient(config);
  const coreClient = options.coreClient ?? createLingRootCoreClient(config);
  const renderClient = options.renderClient ?? createRenderClient(config);

  const visualScenes = planVisualScenes({
    topicId: slug,
    topic,
    sceneCount,
  });
  const durationPerScene = targetDuration / visualScenes.scenes.length;
  for (const [index, scene] of visualScenes.scenes.entries()) {
    const generated = await imageClient.generateImage({
      schemaVersion: 1,
      topicId: slug,
      sceneId: scene.sceneId,
      prompt: scene.imagePrompt,
      size: config.image.size,
      quality: config.image.quality,
      outputFormat: config.image.outputFormat,
      moderation: "auto",
    });
    const imagePath = `${packageDir}/common/images/scene-${String(index + 1).padStart(2, "0")}.${generated.metadata.extension}`;
    await writeBinary(imagePath, generated.bytes);
    scene.imageRef = imagePath;
    scene.imageProvenance = generated.metadata;
    scene.durationSeconds = durationPerScene;
  }
  assertValid("visual-scenes", visualScenes);
  await writeJson(`${packageDir}/common/visual-scenes.json`, visualScenes);
  await writeJson(`${packageDir}/common/image-manifest.json`, visualScenes);

  const levelPackages: TopicPackage["levels"] = [];
  const youtubeBatch: YouTubeMetadata[] = [];
  const instagramBatch: InstagramMetadata[] = [];
  const renderResults: unknown[] = [];

  for (const level of levels) {
    const base = `${packageDir}/levels/${level}`;
    const levelPackage = await coreClient.getLevelPackage({
      topicId: slug,
      topic,
      coreMessage: topic,
      level,
      durationSeconds: targetDuration,
      visualScenes,
      language: "en",
      voiceProfile: config.lingrootCore.voiceProfile,
    });

    const audioPath = `${base}/audio.mp3`;
    const srtPath = `${base}/subtitles.srt`;
    const vttPath = `${base}/subtitles.vtt`;
    const videoPath = `${base}/video.mp4`;
    await writeBinaryPlaceholder(audioPath, `mock-audio-${level}`);
    await writeText(srtPath, toSrt(levelPackage.subtitle.cues));
    await writeText(vttPath, toVtt(levelPackage.subtitle.cues));
    levelPackage.audio.ref = audioPath;
    levelPackage.subtitle.ref = srtPath;

    const youtube = buildYouTubeMetadata(title, level);
    const instagram = buildInstagramMetadata(level);
    assertValid("youtube-metadata", youtube);
    assertValid("instagram-metadata", instagram);
    levelPackage.metadata = {
      title: youtube.title,
      description: youtube.description,
      language: "en",
      tags: youtube.tags,
    };
    assertValid("level-package", levelPackage);

    const renderPayload: RenderPayload = {
      schemaVersion: 1,
      topicId: slug,
      level,
      visualScenes,
      audio: { ref: audioPath, durationSeconds: targetDuration },
      subtitle: { ref: srtPath, format: "srt" },
      levelBadge: levelPackage.levelBadge,
      videoFormat: {
        width: 1080,
        height: 1920,
        fps: config.video.fps,
        durationSeconds: targetDuration,
      },
      outputPath: videoPath,
    };
    assertValid("render-payload", renderPayload);
    const renderResult = await renderClient.render(renderPayload);
    if (renderResult.render_status !== "done") {
      throw new Error(`Render failed for ${level}.`);
    }

    await writeText(
      `${base}/script.txt`,
      `${levelPackage.script.lines.map((line) => line.text).join("\n")}\n`,
    );
    await writeJson(`${base}/level-package.json`, levelPackage);
    await writeJson(`${base}/render-payload.json`, renderPayload);
    await writeJson(`${base}/youtube-metadata.json`, youtube);
    await writeJson(`${base}/instagram-metadata.json`, instagram);

    levelPackages.push(levelPackage);
    youtubeBatch.push(youtube);
    instagramBatch.push(instagram);
    renderResults.push(renderResult);
  }

  const topicPackage: TopicPackage = {
    schemaVersion: 1,
    topicId: slug,
    slug,
    title,
    category: "education",
    corePromise: "Same topic. Your level.",
    createdAt: now.toISOString(),
    visualScenes,
    levels: levelPackages,
  };
  assertValid("topic-package", topicPackage);
  await writeJson(`${packageDir}/topic-package.json`, topicPackage);
  await writeJson(`${packageDir}/social/youtube-batch.json`, youtubeBatch);
  await writeJson(`${packageDir}/social/instagram-batch.json`, instagramBatch);
  await writeJson(`${packageDir}/social/playlist-plan.json`, {
    topicPlaylist: `${title} - All Levels`,
    levelPlaylists: levels.map((level) => `${level} English Listening`),
  });
  await writeJson(`${packageDir}/social/publishing-plan.json`, {
    publishMode: config.publishMode,
    youtube: "review_then_private_upload",
    instagram: "staggered",
    levels,
  });
  await writeJson(`${packageDir}/logs/render-results.json`, renderResults);
  await writeText(
    `${packageDir}/logs/run.log`,
    `${now.toISOString()} ${runId} mock production completed\n`,
  );
  await writeText(
    `${packageDir}/logs/api-calls.log`,
    "No external API calls. Phase 1 mock adapters only.\n",
  );
  await writeText(`${packageDir}/logs/errors.log`, "");

  const qaReport = await runPackageQa({
    packageDir,
    topicPackage,
    expectedLevels: levels,
    runId,
  });
  assertValid("qa-report", qaReport);
  await writeJson(`${packageDir}/qa-report.json`, qaReport);
  for (const level of levels) {
    await writeJson(
      `${packageDir}/levels/${level}/qa-report.json`,
      levelQaReport(qaReport, level),
    );
  }

  const productionReport: ProductionReport = {
    schemaVersion: 1,
    runId,
    topicId: slug,
    startedAt: now.toISOString(),
    finishedAt: new Date().toISOString(),
    dryRun: true,
    publishMode: config.publishMode,
    status: qaReport.passed ? "succeeded" : "failed",
    qaReportRef: `${packageDir}/qa-report.json`,
    levels: levels.map((level) => ({
      level,
      status: qaReport.passed ? "rendered" : "failed",
      videoRef: `${packageDir}/levels/${level}/video.mp4`,
      youtubeVideoId: null,
      instagramMediaId: null,
    })),
    errors: qaReport.checks
      .filter((item) => !item.passed && item.severity === "error")
      .map((item) => ({
        code: item.id,
        message: item.message,
        level: item.level ?? null,
      })),
  };
  assertValid("production-report", productionReport);
  await writeJson(`${packageDir}/production-report.json`, productionReport);

  if (!qaReport.passed) {
    throw new Error(
      `Production package failed QA with ${qaReport.summary?.errors ?? 0} error(s).`,
    );
  }

  return { packageDir, topicPackage, qaReport, productionReport };
}
