/**
 * Minimal structured logger skeleton.
 *
 * SECURITY: never log secrets. Values whose key looks sensitive are redacted
 * before output. Real sinks (file rotation under `logs/`) come in a later phase.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { dateSlug } from "./dates.js";
import { resolvePath } from "./file-system.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SECRET_KEY_PATTERN =
  /(token|secret|password|api[_-]?key|client[_-]?secret|authorization|credential|refresh[_-]?token)/i;

const REDACTED = "[REDACTED]";

/** Recursively redact values whose keys look secret. Shallow-safe for logging. */
export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => redactSecrets(v));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY_PATTERN.test(k) ? REDACTED : redactSecrets(v);
    }
    return out;
  }
  return value;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  child(scope: string): Logger;
}

export interface LoggerOptions {
  minLevel?: LogLevel;
  /** Also append structured JSON lines to a file under `logs/`. */
  toFile?: boolean;
  /** Log file path (relative to project root). Defaults to logs/app-<date>.log. */
  filePath?: string;
}

function appendToFile(filePath: string, line: string): void {
  const full = resolvePath(filePath);
  mkdirSync(dirname(full), { recursive: true });
  appendFileSync(full, `${line}\n`, "utf8");
}

function createLogger(scope: string, opts: Required<Omit<LoggerOptions, "filePath">> & { filePath: string }): Logger {
  function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[opts.minLevel]) return;
    const line: Record<string, unknown> = { ts: new Date().toISOString(), level, scope, message };
    // SECURITY: secrets are never logged — context is redacted before output.
    if (context) line.context = redactSecrets(context);
    const serialized = JSON.stringify(line);
    const sink = level === "error" || level === "warn" ? console.error : console.log;
    sink(serialized);
    if (opts.toFile) appendToFile(opts.filePath, serialized);
  }

  return {
    debug: (m, c) => emit("debug", m, c),
    info: (m, c) => emit("info", m, c),
    warn: (m, c) => emit("warn", m, c),
    error: (m, c) => emit("error", m, c),
    child: (childScope) => createLogger(`${scope}:${childScope}`, opts),
  };
}

export function getLogger(scope = "app", options: LoggerOptions = {}): Logger {
  return createLogger(scope, {
    minLevel: options.minLevel ?? "info",
    toFile: options.toFile ?? false,
    filePath: options.filePath ?? `logs/app-${dateSlug()}.log`,
  });
}
