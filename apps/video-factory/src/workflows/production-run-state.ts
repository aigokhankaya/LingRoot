import { open, unlink } from "node:fs/promises";

import {
  assertValid,
  pathExists,
  readJsonFile,
  resolvePath,
  writeJsonAtomic,
} from "../core/index.js";
import type {
  CefrLevel,
  ProductionRunState,
  ProductionFormat,
  TopicBrief,
} from "../core/types.js";

export const RUN_STATE_FILE = "run-state.json";

export function initialRunState(input: {
  runId: string;
  packageDir: string;
  dryRun: boolean;
  topicBrief: TopicBrief;
  levels: CefrLevel[];
  productionFormat?: ProductionFormat;
  targetDurationSeconds?: number;
  videoWidth?: number;
  videoHeight?: number;
  now?: Date;
}): ProductionRunState {
  const now = (input.now ?? new Date()).toISOString();
  return {
    schemaVersion: 1,
    runId: input.runId,
    stage: "created",
    dryRun: input.dryRun,
    packageDir: input.packageDir,
    createdAt: now,
    updatedAt: now,
    topicBrief: input.topicBrief,
    productionFormat: input.productionFormat,
    targetDurationSeconds: input.targetDurationSeconds,
    videoWidth: input.videoWidth,
    videoHeight: input.videoHeight,
    imageStorageKeys: [],
    levels: input.levels.map((level) => ({ level, status: "pending" })),
    errors: [],
  };
}

export async function readRunState(packageDir: string): Promise<ProductionRunState> {
  return assertValid(
    "production-run-state",
    await readJsonFile<ProductionRunState>(`${packageDir}/${RUN_STATE_FILE}`),
  );
}

export async function saveRunState(state: ProductionRunState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  assertValid("production-run-state", state);
  await writeJsonAtomic(`${state.packageDir}/${RUN_STATE_FILE}`, state);
}

export async function loadOrCreateRunState(input: {
  runId: string;
  packageDir: string;
  dryRun: boolean;
  topicBrief: TopicBrief;
  levels: CefrLevel[];
  productionFormat?: ProductionFormat;
  targetDurationSeconds?: number;
  videoWidth?: number;
  videoHeight?: number;
  now?: Date;
}): Promise<ProductionRunState> {
  const statePath = `${input.packageDir}/${RUN_STATE_FILE}`;
  if (await pathExists(statePath)) return readRunState(input.packageDir);
  const state = initialRunState(input);
  await saveRunState(state);
  return state;
}

export async function acquireRunLock(packageDir: string): Promise<() => Promise<void>> {
  const lockPath = resolvePath(`${packageDir}/.run.lock`);
  let handle;
  try {
    handle = await open(lockPath, "wx");
    await handle.writeFile(`${process.pid} ${new Date().toISOString()}\n`, "utf8");
  } catch (error) {
    throw new Error(
      `Production run is already locked: ${lockPath} (${error instanceof Error ? error.message : String(error)}).`,
    );
  }
  return async () => {
    await handle?.close();
    await unlink(lockPath).catch(() => undefined);
  };
}
