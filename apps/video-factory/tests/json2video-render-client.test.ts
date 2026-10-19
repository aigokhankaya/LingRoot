import { once } from "node:events";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import { Json2VideoRenderClient } from "../src/adapters/json2video-render-client.js";
import type { RenderPayload } from "../src/core/types.js";
import { planVisualScenes } from "../src/services/visual-scene-planner.js";

interface TestServer {
  baseUrl: string;
  close(): Promise<void>;
}

const openServers: TestServer[] = [];

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function startServer(
  handler: (
    request: IncomingMessage,
    response: ServerResponse,
    origin: string,
  ) => Promise<void>,
): Promise<TestServer> {
  let origin = "";
  const server = createServer((request, response) => {
    handler(request, response, origin).catch((error: unknown) => {
      response.statusCode = 500;
      response.end(error instanceof Error ? error.message : String(error));
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Render test server did not expose a TCP address.");
  }
  origin = `http://127.0.0.1:${address.port}`;
  const testServer: TestServer = {
    baseUrl: `${origin}/v2`,
    close: async () => {
      server.close();
      await once(server, "close");
    },
  };
  openServers.push(testServer);
  return testServer;
}

function renderPayload(
  origin = "https://assets.example.com",
): RenderPayload {
  const scenes = planVisualScenes({
    topicId: "render-topic",
    topic: "Render topic",
    sceneCount: 1,
  });
  scenes.scenes[0].imageRef = `${origin}/scene.png`;
  scenes.scenes[0].durationSeconds = 5;
  return {
    schemaVersion: 1,
    topicId: "render-topic",
    level: "A1",
    visualScenes: scenes,
    audio: { ref: `${origin}/audio.mp3`, durationSeconds: 5 },
    subtitle: { ref: `${origin}/subtitles.srt`, format: "srt" },
    levelBadge: { level: "A1", label: "Beginner" },
    videoFormat: {
      width: 1080,
      height: 1920,
      fps: 30,
      durationSeconds: 5,
    },
    outputPath: "outputs/.tmp-render-tests/video.mp4",
  };
}

const FAKE_MP4 = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
  0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d,
]);

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => server.close()));
});

describe("Json2VideoRenderClient", () => {
  it("submits, polls, downloads and maps a successful render", async () => {
    let polls = 0;
    let submitted: Record<string, unknown> | undefined;
    let apiKey: string | undefined;
    const server = await startServer(async (request, response, origin) => {
      apiKey =
        (request.headers["x-api-key"] as string | undefined) ?? apiKey;
      if (request.method === "POST") {
        submitted = JSON.parse((await readBody(request)).toString("utf8"));
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            success: true,
            project: "project-12345678",
            timestamp: "2026-06-22T00:00:00.000Z",
          }),
        );
        return;
      }
      if (request.url === "/video.mp4") {
        response.setHeader("content-type", "video/mp4");
        response.end(FAKE_MP4);
        return;
      }
      polls += 1;
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          success: true,
          movie:
            polls === 1
              ? {
                  project: "project-12345678",
                  status: "running",
                  progress: 50,
                }
              : {
                  project: "project-12345678",
                  status: "done",
                  url: `${origin}/video.mp4`,
                  duration: 5,
                  size: FAKE_MP4.byteLength,
                  width: 1080,
                  height: 1920,
                  rendering_time: 3,
                },
        }),
      );
    });
    const client = new Json2VideoRenderClient({
      apiKey: "json2video-test-key",
      baseUrl: server.baseUrl,
      pollIntervalMs: 1,
      sleep: async () => undefined,
    });

    const result = await client.render(renderPayload());

    expect(apiKey).toBe("json2video-test-key");
    expect(submitted?.resolution).toBe("custom");
    expect(polls).toBe(2);
    expect(result.render_status).toBe("done");
    expect(result.project_id).toBe("project-12345678");
    expect(result.resolution).toBe("1080x1920");
    expect(result.local_video_path).toContain(
      "outputs/.tmp-render-tests/video.mp4",
    );
  });

  it("never retries the non-idempotent submit call", async () => {
    let submits = 0;
    const server = await startServer(async (_request, response) => {
      submits += 1;
      response.statusCode = 503;
      response.end("unavailable");
    });
    const client = new Json2VideoRenderClient({
      apiKey: "test-key",
      baseUrl: server.baseUrl,
      pollMaxAttempts: 3,
      sleep: async () => undefined,
    });

    await expect(client.render(renderPayload())).rejects.toThrow("HTTP 503");
    expect(submits).toBe(1);
  });

  it("retries transient polling errors", async () => {
    let polls = 0;
    const server = await startServer(async (request, response, origin) => {
      if (request.method === "POST") {
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            success: true,
            project: "poll-project-123",
            timestamp: "2026-06-22T00:00:00.000Z",
          }),
        );
        return;
      }
      if (request.url === "/video.mp4") {
        response.end(FAKE_MP4);
        return;
      }
      polls += 1;
      if (polls === 1) {
        response.statusCode = 503;
        response.end("temporary");
        return;
      }
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          success: true,
          movie: {
            project: "poll-project-123",
            status: "done",
            url: `${origin}/video.mp4`,
            width: 1080,
            height: 1920,
            duration: 5,
          },
        }),
      );
    });
    const client = new Json2VideoRenderClient({
      apiKey: "test-key",
      baseUrl: server.baseUrl,
      pollMaxAttempts: 2,
      sleep: async () => undefined,
    });

    expect((await client.render(renderPayload())).render_status).toBe("done");
    expect(polls).toBe(2);
  });

  it("surfaces asynchronous render errors without leaking the key", async () => {
    const apiKey = "sensitive-json2video-key";
    const server = await startServer(async (request, response) => {
      response.setHeader("content-type", "application/json");
      if (request.method === "POST") {
        response.end(
          JSON.stringify({
            success: true,
            project: "error-project-12",
            timestamp: "2026-06-22T00:00:00.000Z",
          }),
        );
        return;
      }
      response.end(
        JSON.stringify({
          success: true,
          movie: {
            project: "error-project-12",
            status: "error",
            message: "Failed to download image",
          },
        }),
      );
    });
    const client = new Json2VideoRenderClient({
      apiKey,
      baseUrl: server.baseUrl,
      sleep: async () => undefined,
    });

    let message = "";
    try {
      await client.render(renderPayload());
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("Failed to download image");
    expect(message).not.toContain(apiKey);
  });
});
