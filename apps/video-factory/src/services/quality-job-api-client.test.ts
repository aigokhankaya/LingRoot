import { afterEach, describe, expect, it, vi } from "vitest";
import { QualityJobApiClient } from "./quality-job-api-client.js";

describe("QualityJobApiClient", () => {
  afterEach(() => vi.restoreAllMocks());

  it("claims quality work using the internal bearer key", async () => {
    const run = { schema_version: 1, quality_run_id: "run-1", campaign_id: "campaign-1", lease_token: "lease", lease_seconds: 90, attempt: 1, mode: "shadow", rubric_version: "v1", package_ref: "file:///tmp/package" };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(run), { status: 200 }));
    const client = new QualityJobApiClient({ baseUrl: "https://lingroot.test/", apiKey: "secret" });
    await expect(client.claim("quality-worker-1")).resolves.toEqual(run);
    expect(fetchMock).toHaveBeenCalledWith("https://lingroot.test/internal/media-quality/claim", expect.objectContaining({
      headers: expect.objectContaining({ authorization: "Bearer secret" }),
      body: JSON.stringify({ worker_id: "quality-worker-1" }),
    }));
  });

  it("returns null for an empty quality queue", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    const client = new QualityJobApiClient({ baseUrl: "https://lingroot.test", apiKey: "secret" });
    await expect(client.claim("quality-worker-1")).resolves.toBeNull();
  });
});
