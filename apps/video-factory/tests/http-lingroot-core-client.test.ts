import { once } from "node:events";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import { HttpLingRootCoreClient } from "../src/adapters/http-lingroot-core-client.js";
import type {
  LingRootCoreApiRequest,
  LingRootCoreApiResponse,
} from "../src/core/types.js";
import { buildVisualScenes } from "../src/testing/fixtures.js";

interface TestServer {
  baseUrl: string;
  close(): Promise<void>;
}

const openServers: TestServer[] = [];

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function startServer(
  handler: (
    request: IncomingMessage,
    response: ServerResponse,
  ) => Promise<void>,
): Promise<TestServer> {
  const server = createServer((request, response) => {
    handler(request, response).catch((error: unknown) => {
      response.statusCode = 500;
      response.end(error instanceof Error ? error.message : String(error));
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address.");
  }
  const testServer: TestServer = {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      server.close();
      await once(server, "close");
    },
  };
  openServers.push(testServer);
  return testServer;
}

function validResponse(request: LingRootCoreApiRequest): LingRootCoreApiResponse {
  const secondsPerScene =
    request.target_duration_seconds / request.scene_ids.length;
  return {
    schema_version: 1,
    topic_id: request.topic_id,
    level: request.target_level,
    voiceover_script: "A complete voiceover script.",
    script_lines: request.scene_ids.map((sceneId) => ({
      scene_id: sceneId,
      text: `${request.target_level} text for ${sceneId}.`,
    })),
    audio_url: "https://assets.lingroot.test/audio.mp3",
    subtitle_url: "https://assets.lingroot.test/subtitles.srt",
    subtitle_lines: request.scene_ids.map((sceneId, index) => ({
      scene_id: sceneId,
      start: index * secondsPerScene,
      end: (index + 1) * secondsPerScene,
      text: `${request.target_level} subtitle for ${sceneId}.`,
    })),
    duration_seconds: request.target_duration_seconds,
    voice_profile: request.voice_profile,
    speaking_rate: 0.9,
  };
}

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => server.close()));
});

describe("HttpLingRootCoreClient", () => {
  it("sends the versioned scene-aware contract and maps the response", async () => {
    let receivedRequest: LingRootCoreApiRequest | undefined;
    let authorization: string | undefined;
    const server = await startServer(async (request, response) => {
      authorization = request.headers.authorization;
      receivedRequest = (await readJson(request)) as LingRootCoreApiRequest;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(validResponse(receivedRequest)));
    });
    const scenes = buildVisualScenes("memory-topic", 2);
    const client = new HttpLingRootCoreClient({
      baseUrl: server.baseUrl,
      apiKey: "test-internal-key",
      maxAttempts: 1,
    });

    const result = await client.getLevelPackage({
      topicId: "memory-topic",
      topic: "Why does sleep help memory?",
      coreMessage: "Sleep supports memory consolidation.",
      level: "B1",
      durationSeconds: 40,
      visualScenes: scenes,
      language: "en",
      voiceProfile: "english_female",
    });

    expect(authorization).toBe("Bearer test-internal-key");
    expect(receivedRequest?.schema_version).toBe(1);
    expect(receivedRequest?.scene_ids).toEqual(["scene-1", "scene-2"]);
    expect(receivedRequest?.scene_briefs).toEqual([
      { scene_id: "scene-1", narrative_beat: "Mock prompt for scene 1 of memory-topic" },
      { scene_id: "scene-2", narrative_beat: "Mock prompt for scene 2 of memory-topic" },
    ]);
    expect(result.level).toBe("B1");
    expect(result.audio.ref).toBe("https://assets.lingroot.test/audio.mp3");
    expect(result.script.lines.map((line) => line.sceneId)).toEqual([
      "scene-1",
      "scene-2",
    ]);
    expect(result.subtitle.cues.at(-1)?.endMs).toBe(40_000);
  });

  it("retries retryable HTTP failures without leaking the API key", async () => {
    let attempts = 0;
    const server = await startServer(async (request, response) => {
      attempts += 1;
      const body = (await readJson(request)) as LingRootCoreApiRequest;
      if (attempts === 1) {
        response.statusCode = 503;
        response.end("temporarily unavailable");
        return;
      }
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(validResponse(body)));
    });
    const client = new HttpLingRootCoreClient({
      baseUrl: server.baseUrl,
      apiKey: "must-not-appear-in-errors",
      maxAttempts: 2,
      sleep: async () => undefined,
    });

    const result = await client.getLevelPackage({
      topicId: "retry-topic",
      coreMessage: "Retry topic",
      level: "A1",
      durationSeconds: 30,
      visualScenes: buildVisualScenes("retry-topic", 2),
    });

    expect(result.level).toBe("A1");
    expect(attempts).toBe(2);
  });

  it("sends the high-quality long-form contract for a seven-minute package", async () => {
    let receivedRequest: LingRootCoreApiRequest | undefined;
    const server = await startServer(async (request, response) => {
      receivedRequest = (await readJson(request)) as LingRootCoreApiRequest;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(validResponse(receivedRequest)));
    });
    const client = new HttpLingRootCoreClient({
      baseUrl: server.baseUrl,
      apiKey: "test-internal-key",
      maxAttempts: 1,
    });

    await client.getLevelPackage({
      topicId: "long-topic",
      coreMessage: "A detailed long-form lesson.",
      level: "C1",
      durationSeconds: 420,
      visualScenes: buildVisualScenes("long-topic", 12),
      voiceProfile: "openai_marin",
      audioQuality: "high",
      productionFormat: "long",
    });

    expect(receivedRequest?.content_style).toBe("long_form_listening_video");
    expect(receivedRequest?.target_duration_seconds).toBe(420);
    expect(receivedRequest?.voice_profile).toBe("openai_marin");
    expect(receivedRequest?.audio_quality).toBe("high");
    expect(receivedRequest?.scene_ids).toHaveLength(12);
  });

  it("aborts requests that exceed the configured timeout", async () => {
    const server = await startServer(async (request, response) => {
      await readJson(request);
      await new Promise((resolve) => setTimeout(resolve, 100));
      response.setHeader("content-type", "application/json");
      response.end("{}");
    });
    const client = new HttpLingRootCoreClient({
      baseUrl: server.baseUrl,
      apiKey: "timeout-test-key",
      timeoutMs: 10,
      maxAttempts: 1,
    });

    await expect(
      client.getLevelPackage({
        topicId: "timeout-topic",
        coreMessage: "Timeout topic",
        level: "A1",
        durationSeconds: 30,
        visualScenes: buildVisualScenes("timeout-topic", 2),
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("does not include the API key in non-retryable errors", async () => {
    const server = await startServer(async (request, response) => {
      await readJson(request);
      response.statusCode = 401;
      response.end("unauthorized");
    });
    const apiKey = "sensitive-internal-api-key";
    const client = new HttpLingRootCoreClient({
      baseUrl: server.baseUrl,
      apiKey,
      maxAttempts: 1,
    });

    let message = "";
    try {
      await client.getLevelPackage({
        topicId: "auth-topic",
        coreMessage: "Auth topic",
        level: "A1",
        durationSeconds: 30,
        visualScenes: buildVisualScenes("auth-topic", 2),
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("HTTP 401");
    expect(message).not.toContain(apiKey);
  });

  it("rejects responses that drift from the requested scene order", async () => {
    const server = await startServer(async (request, response) => {
      const body = (await readJson(request)) as LingRootCoreApiRequest;
      const payload = validResponse(body);
      payload.script_lines.reverse();
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(payload));
    });
    const client = new HttpLingRootCoreClient({
      baseUrl: server.baseUrl,
      apiKey: "test-key",
      maxAttempts: 1,
    });

    await expect(
      client.getLevelPackage({
        topicId: "drift-topic",
        coreMessage: "Scene order matters",
        level: "A2",
        durationSeconds: 30,
        visualScenes: buildVisualScenes("drift-topic", 2),
      }),
    ).rejects.toThrow(
      "script_lines must match the requested scene_ids in order",
    );
  });
});
