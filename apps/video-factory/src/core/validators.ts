/**
 * JSON Schema validation via ajv.
 *
 * Loads every `schemas/*.schema.json` file, registers them on a single ajv
 * instance (so cross-file `$ref`s resolve by `$id`), and exposes typed
 * validators keyed by {@link SchemaName}.
 */

import { readFileSync, readdirSync } from "node:fs";

import Ajv, { type AnySchemaObject, type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import { ValidationError } from "./errors.js";
import { resolvePath } from "./file-system.js";
import type { SchemaName, SchemaTypeMap } from "./types.js";

const SCHEMA_DIR = "schemas";
const SCHEMA_ID_BASE = "https://lingroot.dev/schemas/";

function schemaIdFor(name: SchemaName): string {
  return `${SCHEMA_ID_BASE}${name}.json`;
}

let ajvInstance: Ajv | null = null;

/** Build (once) an ajv instance with every project schema registered. */
export function getAjv(): Ajv {
  if (ajvInstance) return ajvInstance;

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const dir = resolvePath(SCHEMA_DIR);
  const files = readdirSync(dir).filter((f) => f.endsWith(".schema.json"));
  for (const file of files) {
    const raw = readFileSync(resolvePath(`${SCHEMA_DIR}/${file}`), "utf8");
    const schema = JSON.parse(raw) as AnySchemaObject;
    ajv.addSchema(schema);
  }

  ajvInstance = ajv;
  return ajv;
}

function getValidator<N extends SchemaName>(name: N): ValidateFunction<SchemaTypeMap[N]> {
  const ajv = getAjv();
  const validate = ajv.getSchema<SchemaTypeMap[N]>(schemaIdFor(name));
  if (!validate) {
    throw new ValidationError(`No schema registered for "${name}" (${schemaIdFor(name)})`);
  }
  return validate;
}

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors || errors.length === 0) return "unknown validation error";
  return errors
    .map((e) => `${e.instancePath || "(root)"} ${e.message ?? ""}`.trim())
    .join("; ");
}

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: ErrorObject[];
}

/** Validate `data` against a named schema; returns the result, does not throw. */
export function validate<N extends SchemaName>(
  name: N,
  data: unknown,
): ValidationResult<SchemaTypeMap[N]> {
  const validateFn = getValidator(name);
  const valid = validateFn(data);
  return {
    valid,
    data: valid ? (data as SchemaTypeMap[N]) : undefined,
    errors: validateFn.errors ?? [],
  };
}

/** Validate and throw {@link ValidationError} on failure; returns typed data. */
export function assertValid<N extends SchemaName>(name: N, data: unknown): SchemaTypeMap[N] {
  const result = validate(name, data);
  if (!result.valid) {
    throw new ValidationError(`Invalid ${name}: ${formatErrors(result.errors)}`, result.errors);
  }
  return result.data as SchemaTypeMap[N];
}

/** Compile every schema; used by `npm run validate:schemas` as a smoke test. */
export function loadAllSchemas(): SchemaName[] {
  const names: SchemaName[] = [
    "topic-package",
    "visual-scenes",
    "level-package",
    "render-payload",
    "youtube-metadata",
    "instagram-metadata",
    "qa-report",
    "production-report",
    "lingroot-core-request",
    "lingroot-core-response",
    "image-generation-request",
    "image-generation-result",
    "json2video-movie-request",
    "json2video-submit-response",
    "json2video-status-response",
    "integration-check-report",
    "topic-brief",
    "production-run-state",
    "quality-finding",
    "quality-assessment",
    "quality-report",
  ];
  for (const name of names) getValidator(name);
  return names;
}
