import { hostname } from "node:os";
import { fileURLToPath } from "node:url";

import { getConfig, getLogger } from "../core/index.js";
import { runQualityReview } from "../quality/index.js";
import { QualityJobApiClient, type ClaimedQualityRun } from "../services/quality-job-api-client.js";
import { parseArgs } from "./args.js";

const logger = getLogger("quality-worker");

function localPackagePath(reference: string): string {
  if (reference.startsWith("file://")) return fileURLToPath(reference);
  if (/^https?:\/\//.test(reference)) {
    throw new Error("Remote quality package download is not configured. Run the quality worker beside local artifacts or add artifact sync.");
  }
  return reference;
}

async function processRun(api: QualityJobApiClient, run: ClaimedQualityRun): Promise<void> {
  const heartbeat = setInterval(() => {
    void api.heartbeat(run).catch((error) => logger.error("Quality heartbeat failed.", { error: String(error) }));
  }, 30_000);
  try {
    const report = await runQualityReview({
      qualityRunId: run.quality_run_id,
      packageDir: localPackagePath(run.package_ref),
      mode: run.mode,
      onProgress: (stage, progress) => api.progress(run, stage, progress),
    });
    await api.complete(run, report);
    logger.info("Agent quality review completed.", {
      qualityRunId: run.quality_run_id,
      campaignId: run.campaign_id,
      score: report.overallScore,
      recommendation: report.recommendation,
      mode: report.mode,
    });
  } catch (error) {
    await api.fail(run, error, true).catch((reportError) => logger.error("Quality failure could not be reported.", { error: String(reportError) }));
    throw error;
  } finally {
    clearInterval(heartbeat);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const once = args.once === true;
  const config = getConfig();
  const baseUrl = process.env.MEDIA_API_URL || config.lingrootCore.baseUrl;
  const apiKey = process.env.MEDIA_API_KEY || config.lingrootCore.apiKey;
  const workerId = process.env.QUALITY_WORKER_ID || `${hostname()}-quality-${process.pid}`;
  const pollMs = Number.parseInt(process.env.QUALITY_WORKER_POLL_MS || "5000", 10);
  const api = new QualityJobApiClient({ baseUrl, apiKey });
  logger.info("Quality worker started.", { workerId, once, provider: config.quality.provider, mode: config.quality.mode });
  do {
    const run = await api.claim(workerId);
    if (run) {
      await processRun(api, run).catch((error) => logger.error("Quality run failed.", { error: String(error) }));
      if (once) return;
    } else if (once) return;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  } while (!once);
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
