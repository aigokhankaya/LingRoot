/**
 * Thin filesystem helpers. All paths are resolved against the project root so
 * callers can use repo-relative paths.
 */

import { access, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { FileSystemError } from "./errors.js";

/** Repository root, derived from this module's location (src/core -> ../../). */
export const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));

export function resolvePath(relativeOrAbsolute: string): string {
  return isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : resolve(PROJECT_ROOT, relativeOrAbsolute);
}

export async function ensureDir(dirPath: string): Promise<string> {
  const full = resolvePath(dirPath);
  await mkdir(full, { recursive: true });
  return full;
}

export async function readJsonFile<T = unknown>(path: string): Promise<T> {
  const full = resolvePath(path);
  try {
    const raw = await readFile(full, "utf8");
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new FileSystemError(`Failed to read JSON: ${full} (${(err as Error).message})`);
  }
}

/** Write `data` as pretty JSON (creates parent dirs). Returns absolute path. */
export async function writeJson(path: string, data: unknown): Promise<string> {
  const full = resolvePath(path);
  try {
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    return full;
  } catch (err) {
    throw new FileSystemError(`Failed to write JSON: ${full} (${(err as Error).message})`);
  }
}

/** Persist JSON through a same-directory rename so resume state is never partial. */
export async function writeJsonAtomic(path: string, data: unknown): Promise<string> {
  const full = resolvePath(path);
  const temporary = `${full}.${process.pid}.${Date.now()}.tmp`;
  try {
    await mkdir(dirname(full), { recursive: true });
    await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await rename(temporary, full);
    return full;
  } catch (err) {
    await unlink(temporary).catch(() => undefined);
    throw new FileSystemError(
      `Failed to atomically write JSON: ${full} (${(err as Error).message})`,
    );
  }
}

/** Write a UTF-8 text file (creates parent dirs). Returns absolute path. */
export async function writeText(path: string, content: string): Promise<string> {
  const full = resolvePath(path);
  try {
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content, "utf8");
    return full;
  } catch (err) {
    throw new FileSystemError(`Failed to write text: ${full} (${(err as Error).message})`);
  }
}

/** Write raw bytes (creates parent dirs). Returns absolute path. */
export async function writeBinary(path: string, data: Uint8Array): Promise<string> {
  const full = resolvePath(path);
  try {
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, data);
    return full;
  } catch (err) {
    throw new FileSystemError(`Failed to write binary: ${full} (${(err as Error).message})`);
  }
}

/**
 * Write a tiny deterministic placeholder file to stand in for a real binary
 * asset (mock video/audio) in Phase 1/2. Returns absolute path.
 */
export async function writeBinaryPlaceholder(path: string, label = "asset"): Promise<string> {
  const marker = `MOCK_PLACEHOLDER:${label}:${path}`;
  return writeBinary(path, new TextEncoder().encode(marker));
}

export async function readBinary(path: string): Promise<Buffer> {
  const full = resolvePath(path);
  try {
    return await readFile(full);
  } catch (err) {
    throw new FileSystemError(`Failed to read binary: ${full} (${(err as Error).message})`);
  }
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(resolvePath(path));
    return true;
  } catch {
    return false;
  }
}

export async function listFilesRecursive(path: string): Promise<string[]> {
  const root = resolvePath(path);
  const found: string[] = [];

  async function visit(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = resolve(current, entry.name);
      if (entry.isDirectory()) {
        await visit(full);
      } else if (entry.isFile()) {
        found.push(full);
      }
    }
  }

  if (await pathExists(root)) await visit(root);
  return found.sort();
}

export async function latestDirectory(
  path: string,
  markerFile?: string,
): Promise<string | null> {
  const root = resolvePath(path);
  if (!(await pathExists(root))) return null;
  const entries = await readdir(root, { withFileTypes: true });
  const directories = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const full = resolve(root, entry.name);
        const marker = markerFile ? resolve(full, markerFile) : full;
        const info = await stat((await pathExists(marker)) ? marker : full);
        return { full, mtimeMs: info.mtimeMs };
      }),
  );
  directories.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return directories[0]?.full ?? null;
}

export async function removeFileIfExists(path: string): Promise<boolean> {
  const full = resolvePath(path);
  if (!(await pathExists(full))) return false;
  await unlink(full);
  return true;
}
