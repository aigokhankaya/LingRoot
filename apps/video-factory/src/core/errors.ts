/**
 * Typed error hierarchy for the video factory.
 * Skeleton only — extend with domain-specific errors in later phases.
 */

export class VideoFactoryError extends Error {
  readonly code: string;

  constructor(message: string, code = "VIDEO_FACTORY_ERROR") {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

/** A value failed JSON Schema validation. */
export class ValidationError extends VideoFactoryError {
  readonly details: unknown;

  constructor(message: string, details: unknown = null) {
    super(message, "VALIDATION_ERROR");
    this.details = details;
  }
}

/** Required configuration or environment is missing/invalid. */
export class ConfigError extends VideoFactoryError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR");
  }
}

/** A filesystem operation failed. */
export class FileSystemError extends VideoFactoryError {
  constructor(message: string) {
    super(message, "FILE_SYSTEM_ERROR");
  }
}

/** A feature/path that is intentionally not implemented in this phase. */
export class NotImplementedError extends VideoFactoryError {
  constructor(what: string) {
    super(`Not implemented in this phase: ${what}`, "NOT_IMPLEMENTED");
  }
}

/** A configured external service returned an invalid or unsuccessful response. */
export class ExternalServiceError extends VideoFactoryError {
  readonly statusCode?: number;
  readonly retryable: boolean;

  constructor(
    message: string,
    options: { statusCode?: number; retryable?: boolean } = {},
  ) {
    super(message, "EXTERNAL_SERVICE_ERROR");
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
  }
}
