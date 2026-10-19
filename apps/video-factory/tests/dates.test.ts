import { describe, expect, it } from "vitest";

import { dateSlug } from "../src/core/dates.js";

describe("dateSlug", () => {
  it("uses the configured timezone across a UTC date boundary", () => {
    const instant = new Date("2026-06-21T21:30:00.000Z");

    expect(dateSlug(instant, "UTC")).toBe("2026-06-21");
    expect(dateSlug(instant, "Europe/Istanbul")).toBe("2026-06-22");
  });
});
