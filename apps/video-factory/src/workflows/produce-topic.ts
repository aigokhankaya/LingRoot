import {
  createImageClient,
  createLingRootCoreClient,
  createRenderClient,
  createStorageClient,
  createTopicSourceClient,
} from "../adapters/index.js";
import {
  assertValid,
  dateSlug,
  getConfig,
  makeRunId,
  pathExists,
  readBinary,
  readJsonFile,
  slugify,
  writeBinary,
  writeBinaryPlaceholder,
  writeJson,
  writeText,
} from "../core/index.js";
import type {
  CefrLevel,
  AudioQuality,
  LevelPackage,
  ProductionReport,
  ProductionFormat,
  ProductionRunState,
  QaReport,
  RenderPayload,
  TopicPackage,
  TopicBrief,
  VisualScenes,
} from "../core/types.js";
import { ConfigError, ExternalServiceError } from "../core/errors.js";
import { runCefrQa, runMediaQa, runPackageQa } from "../qa/index.js";
import {
  buildInstagramMetadata,
  buildYouTubeMetadata,
  isResumableRenderClient,
  planVisualScenesFromTopicBrief,
  readableSubtitleCues,
  writeReviewPage,
  type ImageClient,
  type LingRootCoreClient,
  type RenderClient,
  type StorageClient,
  type TopicSourceClient,
  type YouTubeMetadataOverrides,
} from "../services/index.js";
import {
  acquireRunLock,
  loadOrCreateRunState,
  readRunState,
  saveRunState,
} from "./production-run-state.js";

const ALL_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const DEFAULT_SCENE_COUNT = 4;
const SIGNED_URL_EXPIRY_SECONDS = 1_800;

export interface ProduceTopicOptions {
  topic?: string;
  topicId?: string;
  levels?: CefrLevel[];
  sceneCount?: number;
  outputRoot?: string;
  resumePackageDir?: string;
  rerender?: boolean;
  durationSeconds?: number;
  voiceProfile?: string;
  audioQuality?: AudioQuality;
  visualStyle?: string;
  productionFormat?: ProductionFormat;
  objective?: "education" | "discovery" | "engagement" | "announcement";
  tone?: "educational" | "warm" | "professional" | "energetic";
  youtubeMetadata?: YouTubeMetadataOverrides;
  onProgress?: (stage: string, progress: number) => void | Promise<void>;
  now?: Date;
  topicSourceClient?: TopicSourceClient;
  coreClient?: LingRootCoreClient;
  imageClient?: ImageClient;
  storageClient?: StorageClient;
  renderClient?: RenderClient;
}

export interface ProduceTopicResult {
  packageDir: string;
  runState: ProductionRunState;
  topicPackage: TopicPackage;
  qaReport: QaReport;
  productionReport: ProductionReport;
}

function toSrt(cues: LevelPackage["subtitle"]["cues"]): string {
  const timestamp = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / 3_600_000);
    const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
    const seconds = Math.floor((milliseconds % 60_000) / 1_000);
    const millis = milliseconds % 1_000;
    return `${[hours, minutes, seconds]
      .map((part) => String(part).padStart(2, "0"))
      .join(":")},${String(millis).padStart(3, "0")}`;
  };
  return cues
    .map(
      (cue, index) =>
        `${index + 1}\n${timestamp(cue.startMs)} --> ${timestamp(cue.endMs)}\n${cue.text}\n`,
    )
    .join("\n");
}

function toVtt(cues: LevelPackage["subtitle"]["cues"]): string {
  return `WEBVTT\n\n${toSrt(cues).replaceAll(",", ".")}`;
}

function levelQaReport(report: QaReport, level: CefrLevel): QaReport {
  const checks = report.checks.filter(
    (check) => check.level === undefined || check.level === level,
  );
  const errors = checks.filter(
    (check) => !check.passed && check.severity === "error",
  ).length;
  const warnings = checks.filter(
    (check) => !check.passed && check.severity === "warn",
  ).length;
  return {
    ...report,
    checks,
    passed: errors === 0,
    score:
      checks.length === 0
        ? 0
        : checks.filter((check) => check.passed).length / checks.length,
    summary: { errors, warnings },
  };
}

function targetDurationSeconds(
  override: number | undefined,
  productionFormat: ProductionFormat,
): number {
  const config = getConfig();
  if (productionFormat === "long") {
    return Math.min(Math.max(override ?? 420, 300), 600);
  }
  return Math.min(
    Math.max(override ?? 45, config.video.minSeconds),
    config.video.maxSeconds,
  );
}

function storageKey(runId: string, suffix: string): string {
  return `production-runs/${runId}/${suffix}`;
}

function levelState(state: ProductionRunState, level: CefrLevel) {
  const found = state.levels.find((item) => item.level === level);
  if (!found) throw new Error(`Missing run state for level ${level}.`);
  return found;
}

function requireHttpUrl(value: string | null | undefined, label: string): string {
  if (!value) throw new ExternalServiceError(`${label} URL is required.`);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ExternalServiceError(`${label} must be an HTTP(S) URL.`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new ExternalServiceError(`${label} must be an HTTP(S) URL.`);
  }
  return value;
}

async function downloadRemoteBinary(url: string, label: string): Promise<Uint8Array> {
  const targetUrl = requireHttpUrl(url, label);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    try {
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: { Accept: "audio/mpeg, audio/*;q=0.9, */*;q=0.1" },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new ExternalServiceError(`${label} download failed with HTTP ${response.status}.`);
      }
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (label === "LingRoot audio" && !contentType.startsWith("audio/")) {
        throw new ExternalServiceError(`${label} download returned content type "${contentType || "missing"}".`);
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0) {
        throw new ExternalServiceError(`${label} download was empty.`);
      }
      return bytes;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  if (lastError instanceof ExternalServiceError) throw lastError;
  throw new ExternalServiceError(`${label} download failed after 3 attempts.`);
}

function safeRenderPayload(
  visualScenes: VisualScenes,
  levelPackage: LevelPackage,
  level: CefrLevel,
  outputPath: string,
  width: number,
  height: number,
): RenderPayload {
  return {
    schemaVersion: 1,
    topicId: visualScenes.topicId,
    level,
    visualScenes,
    audio: { ref: null, durationSeconds: levelPackage.audio.durationSeconds },
    subtitle: { ref: null, format: levelPackage.subtitle.format },
    timeline: levelPackage.timeline,
    levelBadge: levelPackage.levelBadge,
    videoFormat: {
      width,
      height,
      fps: getConfig().video.fps,
      durationSeconds: levelPackage.audio.durationSeconds,
    },
    outputPath,
  };
}

async function loadVisualScenes(
  packageDir: string,
  topicBrief: TopicBrief,
  visualStyle?: string,
  productionFormat: ProductionFormat = "short",
): Promise<VisualScenes> {
  const path = `${packageDir}/common/visual-scenes.json`;
  if (await pathExists(path)) {
    return assertValid("visual-scenes", await readJsonFile<VisualScenes>(path));
  }
  return planVisualScenesFromTopicBrief(topicBrief, visualStyle, productionFormat);
}

function assertRealProductionConfig(): void {
  const config = getConfig();
  const invalid = [
    ["LINGROOT_TOPIC_PROVIDER", config.lingrootTopic.provider, "http"],
    ["LINGROOT_CORE_PROVIDER", config.lingrootCore.provider, "http"],
    ["IMAGE_PROVIDER", config.image.provider, "openai"],
  ].filter(([, actual, expected]) => actual !== expected);
  if (
    config.render.provider !== "ffmpeg" &&
    config.render.provider !== "json2video"
  ) {
    invalid.push(["RENDER_PROVIDER", config.render.provider, "ffmpeg or json2video"]);
  }
  if (
    config.render.provider === "json2video" &&
    config.storage.provider !== "supabase"
  ) {
    invalid.push(["STORAGE_PROVIDER", config.storage.provider, "supabase with json2video"]);
  }
  if (invalid.length > 0) {
    throw new ConfigError(
      `Real production requires ${invalid
        .map(([name, , expected]) => `${name}=${expected}`)
        .join(", ")}.`,
    );
  }
}

export async function runTopicProduction(
  options: ProduceTopicOptions = {},
): Promise<ProduceTopicResult> {
  const config = getConfig();
  const dryRun = config.dryRun;
  if (!dryRun) assertRealProductionConfig();

  let state: ProductionRunState;
  let packageDir: string;
  if (options.resumePackageDir) {
    packageDir = options.resumePackageDir;
    state = await readRunState(packageDir);
  } else {
    const requestedFormat = options.productionFormat ?? "short";
    const sceneCount = options.sceneCount ?? (requestedFormat === "long" ? 12 : DEFAULT_SCENE_COUNT);
    const requestedDuration = targetDurationSeconds(options.durationSeconds, requestedFormat);
    const videoWidth = requestedFormat === "long" ? 1920 : config.video.width;
    const videoHeight = requestedFormat === "long" ? 1080 : config.video.height;
    const topicSource = options.topicSourceClient ?? createTopicSourceClient(config);
    const topicBrief = assertValid(
      "topic-brief",
      await topicSource.getTopicBrief({
        topic: options.topic,
        topicId: options.topicId,
        sceneCount,
        language: "en",
      }),
    );
    const now = options.now ?? new Date();
    const slug = slugify(topicBrief.title).slice(0, 80) || "topic";
    const runId = makeRunId(slug, now);
    packageDir = `${options.outputRoot ?? "outputs/topic-packages"}/${dateSlug(
      now,
      config.scheduler.timezone,
    )}_${slug}_${runId}`;
    state = await loadOrCreateRunState({
      runId,
      packageDir,
      dryRun,
      topicBrief,
      levels: options.levels ?? ALL_LEVELS,
      productionFormat: requestedFormat,
      targetDurationSeconds: requestedDuration,
      videoWidth,
      videoHeight,
      now,
    });
  }

  const releaseLock = await acquireRunLock(packageDir);
  try {
    const productionFormat = state.productionFormat ?? options.productionFormat ?? "short";
    if (options.productionFormat && state.productionFormat && options.productionFormat !== state.productionFormat) {
      throw new ConfigError("A production run cannot be resumed with a different format.");
    }
    const durationSeconds = state.targetDurationSeconds
      ?? targetDurationSeconds(options.durationSeconds, productionFormat);
    const videoWidth = state.videoWidth ?? (productionFormat === "long" ? 1920 : config.video.width);
    const videoHeight = state.videoHeight ?? (productionFormat === "long" ? 1080 : config.video.height);
    const levels = state.levels.map((item) => item.level);
    const imageClient = options.imageClient ?? createImageClient(config);
    const coreClient = options.coreClient ?? createLingRootCoreClient(config);
    const renderClient = options.renderClient ?? createRenderClient(config);
    const storageClient =
      options.storageClient ?? (dryRun ? undefined : createStorageClient(config));
    await options.onProgress?.("generating_visuals", 10);
    let visualScenes = await loadVisualScenes(
      packageDir,
      state.topicBrief,
      options.visualStyle,
      productionFormat,
    );
    const fallbackSceneDuration = durationSeconds / visualScenes.scenes.length;
    for (const scene of visualScenes.scenes) {
      scene.durationSeconds = fallbackSceneDuration;
    }

    for (const [index, scene] of visualScenes.scenes.entries()) {
      const extension = scene.imageProvenance?.extension ?? config.image.outputFormat.replace("jpeg", "jpg");
      const localPath = `${packageDir}/common/images/scene-${String(index + 1).padStart(2, "0")}.${extension}`;
      const stored = state.imageStorageKeys.find(
        (item) => item.sceneId === scene.sceneId,
      );
      if (scene.imageRef && (await pathExists(scene.imageRef))) continue;
      if (stored && storageClient) {
        const bytes = await storageClient.retrieve(stored.key);
        await writeBinary(localPath, bytes);
        scene.imageRef = localPath;
        scene.storageRef = `storage://${stored.key}`;
        scene.imageHash = createHash("sha256").update(bytes).digest("hex");
      } else {
        const generated = await imageClient.generateImage({
          schemaVersion: 1,
          topicId: state.topicBrief.topicId,
          sceneId: scene.sceneId,
          prompt: scene.imagePrompt,
          size: productionFormat === "long" ? "1536x1024" : config.image.size,
          quality: config.image.quality,
          outputFormat: config.image.outputFormat,
          moderation: "auto",
        });
        const imagePath = `${packageDir}/common/images/scene-${String(index + 1).padStart(2, "0")}.${generated.metadata.extension}`;
        await writeBinary(imagePath, generated.bytes);
        scene.imageRef = imagePath;
        scene.imageHash = createHash("sha256")
          .update(generated.bytes)
          .digest("hex");
        scene.imageProvenance = generated.metadata;
        if (storageClient) {
          const key = storageKey(
            state.runId,
            `common/images/scene-${String(index + 1).padStart(2, "0")}.${generated.metadata.extension}`,
          );
          const object = await storageClient.store(key, generated.bytes, {
            contentType: generated.metadata.contentType,
            cacheControl: "31536000",
            upsert: false,
          });
          scene.storageRef = object.path;
          state.imageStorageKeys.push({ sceneId: scene.sceneId, key });
          await saveRunState(state);
        }
      }
      await writeJson(`${packageDir}/common/visual-scenes.json`, visualScenes);
    }
    assertValid("visual-scenes", visualScenes);
    await writeJson(`${packageDir}/common/image-manifest.json`, visualScenes);
    state.stage = "visuals_ready";
    await saveRunState(state);
    await options.onProgress?.("generating_levels", 25);

    const levelPackages: LevelPackage[] = [];
    for (const [levelIndex, level] of levels.entries()) {
      const current = levelState(state, level);
      const base = `${packageDir}/levels/${level}`;
      const levelPackagePath = `${base}/level-package.json`;
      let levelPackage: LevelPackage;
      if (current.status !== "pending" && (await pathExists(levelPackagePath))) {
        levelPackage = assertValid(
          "level-package",
          await readJsonFile<LevelPackage>(levelPackagePath),
        );
      } else {
        levelPackage = await coreClient.getLevelPackage({
          topicId: state.topicBrief.topicId,
          topic: state.topicBrief.title,
          coreMessage: state.topicBrief.coreMessage,
          level,
          durationSeconds,
          visualScenes,
          language: state.topicBrief.language,
          voiceProfile: options.voiceProfile || config.lingrootCore.voiceProfile,
          audioQuality: options.audioQuality ?? (productionFormat === "long" ? "high" : "standard"),
          productionFormat,
          objective: options.objective,
          tone: options.tone,
        });
        assertValid("level-package", levelPackage);
        const audioPath = `${base}/audio.mp3`;
        const srtPath = `${base}/subtitles.srt`;
        const vttPath = `${base}/subtitles.vtt`;
        const srt = toSrt(levelPackage.subtitle.cues);
        if (dryRun) {
          await writeBinaryPlaceholder(audioPath, `mock-audio-${level}`);
        } else {
          if (!storageClient) throw new ConfigError("Production storage client is required.");
          const audioBytes = await downloadRemoteBinary(levelPackage.audio.ref ?? "", "LingRoot audio");
          await writeBinary(audioPath, audioBytes);
          const audioKey = storageKey(state.runId, `levels/${level}/audio.mp3`);
          await storageClient.store(audioKey, audioBytes, {
            contentType: "audio/mpeg",
            cacheControl: "31536000",
            upsert: false,
          });
          current.audioStorageKey = audioKey;
        }
        await writeText(srtPath, srt);
        await writeText(vttPath, toVtt(levelPackage.subtitle.cues));
        if (!dryRun) {
          if (!storageClient) throw new ConfigError("Production storage client is required.");
          const subtitleKey = storageKey(state.runId, `levels/${level}/subtitles.srt`);
          await storageClient.store(subtitleKey, srt, {
            contentType: "application/x-subrip; charset=utf-8",
            cacheControl: "31536000",
            upsert: false,
          });
          current.subtitleStorageKey = subtitleKey;
        }
        levelPackage.audio.ref = audioPath;
        levelPackage.subtitle.ref = srtPath;
        await writeText(
          `${base}/script.txt`,
          `${levelPackage.script.lines.map((line) => line.text).join("\n")}\n`,
        );
        await writeJson(
          `${base}/instagram-metadata.json`,
          buildInstagramMetadata(level),
        );
        current.status = "core_ready";
        await saveRunState(state);
      }
      const youtubeMetadata = buildYouTubeMetadata(
        state.topicBrief.title,
        level,
        productionFormat,
        options.youtubeMetadata,
      );
      levelPackage.metadata = {
        title: youtubeMetadata.title,
        description: youtubeMetadata.description,
        language: state.topicBrief.language,
        tags: youtubeMetadata.tags,
      };
      levelPackage.subtitle.cues = readableSubtitleCues(levelPackage.subtitle.cues);
      assertValid("level-package", levelPackage);
      await writeText(`${base}/subtitles.srt`, toSrt(levelPackage.subtitle.cues));
      await writeText(`${base}/subtitles.vtt`, toVtt(levelPackage.subtitle.cues));
      await writeJson(levelPackagePath, levelPackage);
      await writeJson(`${base}/youtube-metadata.json`, youtubeMetadata);
      levelPackages.push(levelPackage);
      await options.onProgress?.(
        "generating_levels",
        25 + Math.round(((levelIndex + 1) / levels.length) * 35),
      );
    }
    state.stage = "levels_ready";
    await saveRunState(state);

    for (const [renderIndex, levelPackage] of levelPackages.entries()) {
      const level = levelPackage.level;
      const current = levelState(state, level);
      const base = `${packageDir}/levels/${level}`;
      const videoPath = `${base}/video.mp4`;
      if (
        !options.rerender &&
        current.status === "rendered" &&
        current.videoPath &&
        (await pathExists(current.videoPath))
      ) {
        continue;
      }
      const safePayload = safeRenderPayload(
        visualScenes,
        levelPackage,
        level,
        videoPath,
        videoWidth,
        videoHeight,
      );
      assertValid("render-payload", safePayload);
      await writeJson(`${base}/render-payload.json`, safePayload);

      let renderPayload = safePayload;
      if (!dryRun) {
        if (config.render.provider === "json2video") {
          if (!storageClient || !current.audioStorageKey || !current.subtitleStorageKey) {
            throw new ConfigError(`Production storage keys are required for ${level}.`);
          }
          const imageUrlByScene = new Map(
            await Promise.all(
              state.imageStorageKeys.map(async (item) => [
                item.sceneId,
                await storageClient.createSignedReadUrl(item.key, SIGNED_URL_EXPIRY_SECONDS),
              ] as const),
            ),
          );
          renderPayload = {
            ...safePayload,
            visualScenes: {
              ...visualScenes,
              scenes: visualScenes.scenes.map((scene) => ({
                ...scene,
                imageRef: imageUrlByScene.get(scene.sceneId) ?? null,
              })),
            },
            audio: {
              ...safePayload.audio,
              ref: await storageClient.createSignedReadUrl(
                current.audioStorageKey,
                SIGNED_URL_EXPIRY_SECONDS,
              ),
            },
            subtitle: {
              ...safePayload.subtitle,
              ref: await storageClient.createSignedReadUrl(
                current.subtitleStorageKey,
                SIGNED_URL_EXPIRY_SECONDS,
              ),
            },
          };
        } else {
          renderPayload = {
            ...safePayload,
            visualScenes,
            audio: { ...safePayload.audio, ref: levelPackage.audio.ref ?? null },
            subtitle: {
              ...safePayload.subtitle,
              ref: levelPackage.subtitle.ref ?? null,
            },
          };
        }
      }
      const result = isResumableRenderClient(renderClient)
        ? await (async () => {
            const projectId = current.renderProjectId ?? (await renderClient.submitRender(renderPayload));
            if (!current.renderProjectId) {
              current.renderProjectId = projectId;
              current.status = "render_submitted";
              await saveRunState(state);
            }
            return renderClient.completeRender(projectId, renderPayload);
          })()
        : await renderClient.render(renderPayload);
      if (result.render_status !== "done") {
        throw new ExternalServiceError(`Render failed for ${level}.`);
      }
      await writeJson(`${base}/render-result.json`, {
        provider: result.provider,
        projectId: result.project_id,
        localVideoPath: result.local_video_path,
        durationSeconds: result.duration_seconds,
        resolution: result.resolution,
        bytes: result.bytes,
        renderingTimeSeconds: result.rendering_time_seconds,
      });
      current.status = "rendered";
      current.videoPath = result.local_video_path ?? videoPath;
      current.renderProjectId = result.project_id ?? current.renderProjectId;
      await saveRunState(state);
      await options.onProgress?.(
        "rendering",
        60 + Math.round(((renderIndex + 1) / levelPackages.length) * 30),
      );
    }
    state.stage = "rendered";
    await saveRunState(state);
    await options.onProgress?.("qa", 94);

    const topicPackage: TopicPackage = {
      schemaVersion: 1,
      topicId: state.topicBrief.topicId,
      slug: slugify(state.topicBrief.title) || state.topicBrief.topicId,
      title: state.topicBrief.title,
      category: state.topicBrief.category,
      corePromise: "Same topic. Your level.",
      createdAt: state.createdAt,
      visualScenes,
      levels: levelPackages,
    };
    assertValid("topic-package", topicPackage);
    await writeJson(`${packageDir}/topic-package.json`, topicPackage);
    await writeJson(`${packageDir}/social/youtube-batch.json`, levels.map((level) =>
      buildYouTubeMetadata(
        state.topicBrief.title,
        level,
        productionFormat,
        options.youtubeMetadata,
      ),
    ));
    await writeJson(`${packageDir}/social/instagram-batch.json`, levels.map((level) =>
      buildInstagramMetadata(level),
    ));
    await writeJson(`${packageDir}/social/playlist-plan.json`, {
      topicPlaylist: `${state.topicBrief.title} | All Levels`,
      levelPlaylists: levels.map((level) => `${level} English Listening`),
    });
    await writeJson(`${packageDir}/social/publishing-plan.json`, {
      publishMode: "review",
      youtube: "review_then_private_upload",
      levels,
    });

    let qaReport = await runPackageQa({
      packageDir,
      topicPackage,
      expectedLevels: levels,
      runId: state.runId,
    });
    if (!dryRun) {
      const mediaChecks = await runMediaQa(
        levelPackages,
        new Map(
          state.levels
            .filter((item): item is typeof item & { videoPath: string } =>
              typeof item.videoPath === "string",
            )
            .map((item) => [item.level, item.videoPath]),
        ),
        {
          width: videoWidth,
          height: videoHeight,
          minSeconds: productionFormat === "long" ? 300 : config.video.minSeconds,
          maxSeconds: productionFormat === "long" ? 600 : config.video.maxSeconds,
        },
      );
      const checks = [...qaReport.checks, ...runCefrQa(levelPackages), ...mediaChecks];
      const errors = checks.filter(
        (check) => !check.passed && check.severity === "error",
      ).length;
      const warnings = checks.filter(
        (check) => !check.passed && check.severity === "warn",
      ).length;
      qaReport = {
        ...qaReport,
        checks,
        passed: errors === 0,
        score:
          checks.length === 0
            ? 0
            : checks.filter((check) => check.passed).length / checks.length,
        summary: { errors, warnings },
      };
    }
    assertValid("qa-report", qaReport);
    await writeJson(`${packageDir}/qa-report.json`, qaReport);
    await writeReviewPage({ packageDir, topicPackage, qaReport });
    for (const level of levels) {
      await writeJson(`${packageDir}/levels/${level}/qa-report.json`, levelQaReport(qaReport, level));
    }
    state.qaPassed = qaReport.passed;
    state.stage = qaReport.passed ? "review_ready" : "failed";
    if (qaReport.passed) state.errors = [];
    await saveRunState(state);

    const productionReport: ProductionReport = {
      schemaVersion: 1,
      runId: state.runId,
      topicId: state.topicBrief.topicId,
      startedAt: state.createdAt,
      finishedAt: new Date().toISOString(),
      dryRun,
      publishMode: "review",
      status: qaReport.passed ? "succeeded" : "failed",
      qaReportRef: `${packageDir}/qa-report.json`,
      levels: state.levels.map((item) => ({
        level: item.level,
        status: item.status === "rendered" ? "rendered" : "failed",
        videoRef: item.videoPath ?? null,
        youtubeVideoId: item.youtubeVideoId ?? null,
        instagramMediaId: null,
      })),
      errors: state.errors,
    };
    assertValid("production-report", productionReport);
    await writeJson(`${packageDir}/production-report.json`, productionReport);
    if (!qaReport.passed) {
      throw new Error(`Production package failed QA with ${qaReport.summary?.errors ?? 0} error(s).`);
    }
    return { packageDir, runState: state, topicPackage, qaReport, productionReport };
  } catch (error) {
    state.stage = "failed";
    const failure = {
      message: error instanceof Error ? error.message : String(error),
      level: null,
    } as { message: string; level: null; code?: string };
    if (error instanceof Error && "code" in error && typeof error.code === "string") {
      failure.code = error.code;
    }
    state.errors.push(failure);
    await saveRunState(state);
    throw error;
  } finally {
    await releaseLock();
  }
}
import { createHash } from "node:crypto";
