/**
 * Date/time helpers (skeleton). ISO-8601 everywhere.
 */

export function nowIso(): string {
  return new Date().toISOString();
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Filename-safe date slug, e.g. "2026-06-21". */
export function dateSlug(
  when: Date = new Date(),
  timezone = "UTC",
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(when);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** Stable, filename-safe run id, e.g. "20260621T091500Z-ordering-coffee". */
export function makeRunId(slug: string, when: Date = new Date()): string {
  const stamp = when.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return `${stamp}-${slug}`;
}
