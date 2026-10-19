import type { CefrLevel, GenerationMode } from "../core/types.js";
import { ConfigError } from "../core/errors.js";

const LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const MODES: GenerationMode[] = [
  "dry-run",
  "test-single-level",
  "test-six-levels",
  "production",
];

export function parseArgs(argv: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      result[rawKey] = inlineValue;
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      result[rawKey] = next;
      index += 1;
    } else {
      result[rawKey] = true;
    }
  }
  return result;
}

export function parseLevels(value: string | boolean | undefined): CefrLevel[] | undefined {
  if (typeof value !== "string") return undefined;
  const levels = value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  for (const level of levels) {
    if (!LEVELS.includes(level as CefrLevel)) {
      throw new ConfigError(`Unknown CEFR level: ${level}`);
    }
  }
  return levels as CefrLevel[];
}

export function parseMode(value: string | boolean | undefined): GenerationMode {
  if (typeof value !== "string") return "dry-run";
  const normalized = value === "test" ? "test-single-level" : value;
  if (!MODES.includes(normalized as GenerationMode)) {
    throw new ConfigError(`Unknown generation mode: ${value}`);
  }
  return normalized as GenerationMode;
}

export function parsePositiveInt(
  name: string,
  value: string | boolean | undefined,
): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ConfigError(`${name} must be a positive integer.`);
  }
  return parsed;
}
