import { hostname } from "node:os";
import { stat } from "node:fs/promises";
import { sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getConfig,
  getLogger,
  latestDirectory,
  pathExists,
  resolvePath,
  writeJson,
} from "../core/index.js";
import { ConfigError } from "../core/errors.js";
import type { CefrLevel } from "../core/types.js";
import {
  MediaJobApiClient,
  type ClaimedMediaJob,
  type MediaArtifactInput,
} from "../services/media-job-api-client.js";
import {
  approveTopicProduction,
  readRunState,
  releaseTopicProduction,
  runTopicProduction,
} from "../workflows/index.js";
import { parseArgs } from "./args.js";

const logger = getLogger("media-worker");

function artifactUri(path: string): string {
  const absolute = resolvePath(path);
  const publicBase = process.env.MEDIA_ARTIFACT_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (publicBase) {
    const relative = absolute.slice(resolvePath(".").length).replace(/^\/+/, "");
    return `${publicBase}/${relative}`;
  }
  return `file://${absolute}`;
}

async function artifact(
  path: string,
  input: Omit<MediaArtifactInput, "uri" | "bytes">,
): Promise<MediaArtifactInput> {
  return { ...input, uri: artifactUri(path), bytes: (await stat(resolvePath(path))).size };
}

async function collectArtifacts(
  job: ClaimedMediaJob,
  packageDir: string,
  durations: Map<string, number>,
): Promise<MediaArtifactInput[]> {
  const artifacts: MediaArtifactInput[] = [];
  artifacts.push(
    await artifact(`${packageDir}/review/index.html`, { kind: "review", content_type: "text/html" }),
    await artifact(`${packageDir}/qa-report.json`, { kind: "qa_report", content_type: "application/json" }),
    await artifact(`${packageDir}/production-report.json`, { kind: "production_report", content_type: "application/json" }),
  );
  for (const level of job.campaign.levels) {
    artifacts.push(
      await artifact(`${packageDir}/levels/${level}/video.mp4`, {
        level,
        kind: "video",
        content_type: "video/mp4",
        duration_seconds: durations.get(level),
      }),
      await artifact(`${packageDir}/levels/${level}/audio.mp3`, { level, kind: "audio", content_type: "audio/mpeg" }),
      await artifact(`${packageDir}/levels/${level}/subtitles.srt`, { level, kind: "subtitle", content_type: "application/x-subrip" }),
    );
  }
  for (const target of job.campaign.targets) {
    const metadataPath = `${packageDir}/platforms/${target.platform}.json`;
    await writeJson(metadataPath, {
      schemaVersion: 1,
      platform: target.platform,
      format: target.format,
      title: target.title,
      caption: target.caption,
      hashtags: target.hashtags,
      cta: job.campaign.cta,
      status: "review_ready",
      publishing: target.platform === "youtube" ? "manual_release" : "not_configured",
    });
    artifacts.push(await artifact(metadataPath, {
      target_id: target.id,
      kind: "platform_metadata",
      content_type: "application/json",
      metadata: { platform: target.platform },
    }));
  }
  return artifacts;
}

function configString(config: Record<string, unknown>, key: string): string | undefined {
  const value = config[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function configBoolean(config: Record<string, unknown>, key: string): boolean | undefined {
  const value = config[key];
  return typeof value === "boolean" ? value : undefined;
}

async function processGeneration(api: MediaJobApiClient, job: ClaimedMediaJob): Promise<void> {
  const outputRoot = `outputs/media-jobs/${job.campaign.id}`;
  const resumePackageDir = job.attempt > 1
    ? await latestDirectory(outputRoot, "run-state.json")
    : null;
  const productionFormat = job.campaign.targets.some(
      (target) => target.platform === "youtube" && target.format === "horizontal_video",
    ) ? "long" : "short";
    const youtubeTarget = job.campaign.targets.find((target) => target.platform === "youtube");
    const youtubeConfig = youtubeTarget?.config ?? {};
    const result = await runTopicProduction({
      topic: job.campaign.topic,
      levels: job.campaign.levels as CefrLevel[],
      sceneCount: job.campaign.sceneCount,
      durationSeconds: job.campaign.targetDurationSeconds,
      voiceProfile: job.campaign.voiceProfile,
      audioQuality: job.campaign.voiceQuality,
      visualStyle: job.campaign.visualStyle,
      productionFormat,
      objective: job.campaign.objective,
      tone: job.campaign.tone,
      youtubeMetadata: youtubeTarget ? {
        title: youtubeTarget.title,
        description: youtubeTarget.caption,
        tags: youtubeTarget.hashtags,
        categoryId: configString(youtubeConfig, "categoryId") ?? "27",
        madeForKids: configBoolean(youtubeConfig, "madeForKids") ?? false,
        cta: job.campaign.cta,
      } : undefined,
      outputRoot,
      resumePackageDir: resumePackageDir ?? undefined,
      onProgress: (stage, progress) => api.progress(job, stage, progress),
    });
    const durations = new Map(result.topicPackage.levels.map((level) => [level.level, level.audio.durationSeconds]));
    const artifacts = await collectArtifacts(job, result.packageDir, durations);
    await api.complete(job, {
      packageDir: artifactUri(result.packageDir),
      runId: result.runState.runId,
      qaPassed: result.qaReport.passed,
    }, artifacts);
    logger.info("Media job completed.", { jobId: job.job_id, campaignId: job.campaign.id });
}

function insideDirectory(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${sep}`);
}

async function resolvePublicationPackage(job: ClaimedMediaJob): Promise<string> {
  const outputRoot = resolvePath(`outputs/media-jobs/${job.campaign.id}`);
  const packageRef = configString(job.payload, "packageRef");
  if (packageRef?.startsWith("file://")) {
    const candidate = resolvePath(fileURLToPath(packageRef));
    if (
      insideDirectory(outputRoot, candidate) &&
      await pathExists(`${candidate}/run-state.json`)
    ) {
      return candidate;
    }
  }
  const latest = await latestDirectory(outputRoot, "run-state.json");
  if (!latest) {
    throw new ConfigError("The approved media package is not available on this worker.");
  }
  return latest;
}

async function processPublication(api: MediaJobApiClient, job: ClaimedMediaJob): Promise<void> {
  const packageDir = await resolvePublicationPackage(job);
  const state = await readRunState(packageDir);
  if (state.stage === "review_ready") {
    await approveTopicProduction(packageDir);
  } else if (state.stage !== "review_approved" && state.stage !== "released") {
    throw new ConfigError(`Package stage ${state.stage} cannot be released.`);
  }
  const requestedPrivacy = configString(job.payload, "privacyStatus") ?? "private";
  if (requestedPrivacy !== "private" && requestedPrivacy !== "public") {
    throw new ConfigError("YouTube privacyStatus must be private or public.");
  }
  const released = await releaseTopicProduction({
    packageDir,
    targetPrivacy: requestedPrivacy,
  });
  const youtubeVideoIds = Object.fromEntries(
    released.levels
      .filter((item): item is typeof item & { youtubeVideoId: string } =>
        typeof item.youtubeVideoId === "string",
      )
      .map((item) => [item.level, item.youtubeVideoId]),
  );
  await api.complete(job, {
    packageDir: artifactUri(packageDir),
    privacyStatus: requestedPrivacy,
    topicPlaylistId: released.topicPlaylistId ?? null,
    youtubeVideoIds,
  }, []);
  logger.info("YouTube publication completed.", {
    jobId: job.job_id,
    campaignId: job.campaign.id,
    privacyStatus: requestedPrivacy,
  });
}

async function processJob(api: MediaJobApiClient, job: ClaimedMediaJob): Promise<void> {
  const heartbeat = setInterval(() => {
    void api.heartbeat(job).catch((error) => logger.error(
      "Media job heartbeat failed.",
      { error: String(error) },
    ));
  }, 30_000);
  try {
    if (job.action === "publish") await processPublication(api, job);
    else await processGeneration(api, job);
  } catch (error) {
    await api.fail(job, error, !(error instanceof ConfigError)).catch((reportError) => {
      logger.error("Media job failure could not be reported.", { error: String(reportError) });
    });
    throw error;
  } finally {
    clearInterval(heartbeat);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const config = getConfig();
  const baseUrl = process.env.MEDIA_API_URL || config.lingrootCore.baseUrl;
  const apiKey = process.env.MEDIA_API_KEY || config.lingrootCore.apiKey;
  const workerId = process.env.MEDIA_WORKER_ID || `${hostname()}-${process.pid}`;
  const pollMs = Number.parseInt(process.env.MEDIA_WORKER_POLL_MS || "5000", 10);
  const once = args.once === true;
  const api = new MediaJobApiClient({ baseUrl, apiKey });
  logger.info("Media worker started.", { workerId, once });
  do {
    const job = await api.claim(workerId);
    if (job) {
      await processJob(api, job).catch((error) => logger.error("Media job failed.", { error: String(error) }));
      if (once) return;
    } else if (once) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  } while (!once);
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
