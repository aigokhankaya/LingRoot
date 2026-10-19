import { once } from "node:events";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import { OpenAiImageClient } from "../src/adapters/openai-image-client.js";

interface TestServer {
  baseUrl: string;
  close(): Promise<void>;
}

const openServers: TestServer[] = [];
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

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
    throw new Error("Image test server did not expose a TCP address.");
  }
  const testServer: TestServer = {
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    close: async () => {
      server.close();
      await once(server, "close");
    },
  };
  openServers.push(testServer);
  return testServer;
}

function imageRequest() {
  return {
    schemaVersion: 1 as const,
    topicId: "memory-topic",
    sceneId: "scene-1",
    prompt: "Warm portrait editorial photo, no text or logos.",
    size: "1024x1536",
    quality: "low" as const,
    outputFormat: "png" as const,
    moderation: "auto" as const,
  };
}

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => server.close()));
});

describe("OpenAiImageClient", () => {
  it("sends the Image API request and maps base64 bytes with provenance", async () => {
    let body: Record<string, unknown> | undefined;
    let authorization: string | undefined;
    const server = await startServer(async (request, response) => {
      expect(request.url).toBe("/v1/images/generations");
      authorization = request.headers.authorization;
      body = (await readJson(request)) as Record<string, unknown>;
      response.setHeader("content-type", "application/json");
      response.setHeader("x-request-id", "req_image_123");
      response.end(
        JSON.stringify({
          created: 1_782_076_800,
          data: [{ b64_json: PNG_BASE64 }],
        }),
      );
    });
    const client = new OpenAiImageClient({
      apiKey: "test-openai-key",
      baseUrl: server.baseUrl,
      model: "gpt-image-2",
      maxAttempts: 1,
    });

    const result = await client.generateImage(imageRequest());

    expect(authorization).toBe("Bearer test-openai-key");
    expect(body).toEqual({
      model: "gpt-image-2",
      prompt: imageRequest().prompt,
      n: 1,
      size: "1024x1536",
      quality: "low",
      output_format: "png",
      moderation: "auto",
      background: "opaque",
    });
    expect(result.bytes[0]).toBe(0x89);
    expect(result.metadata.provider).toBe("openai");
    expect(result.metadata.model).toBe("gpt-image-2");
    expect(result.metadata.requestId).toBe("req_image_123");
    expect(result.metadata.contentType).toBe("image/png");
  });

  it("retries rate-limit responses", async () => {
    let attempts = 0;
    const server = await startServer(async (request, response) => {
      attempts += 1;
      await readJson(request);
      if (attempts === 1) {
        response.statusCode = 429;
        response.end("rate limited");
        return;
      }
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ data: [{ b64_json: PNG_BASE64 }] }));
    });
    const client = new OpenAiImageClient({
      apiKey: "test-key",
      baseUrl: server.baseUrl,
      maxAttempts: 2,
      sleep: async () => undefined,
    });

    const result = await client.generateImage(imageRequest());

    expect(result.metadata.provider).toBe("openai");
    expect(attempts).toBe(2);
  });

  it("rejects malformed image data", async () => {
    const server = await startServer(async (request, response) => {
      await readJson(request);
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          data: [{ b64_json: Buffer.from("not-a-png").toString("base64") }],
        }),
      );
    });
    const client = new OpenAiImageClient({
      apiKey: "test-key",
      baseUrl: server.baseUrl,
      maxAttempts: 1,
    });

    await expect(client.generateImage(imageRequest())).rejects.toThrow(
      "not a valid png image",
    );
  });

  it("times out without exposing the API key", async () => {
    const server = await startServer(async (request, response) => {
      await readJson(request);
      await new Promise((resolve) => setTimeout(resolve, 100));
      response.end(JSON.stringify({ data: [{ b64_json: PNG_BASE64 }] }));
    });
    const apiKey = "sensitive-openai-key";
    const client = new OpenAiImageClient({
      apiKey,
      baseUrl: server.baseUrl,
      timeoutMs: 10,
      maxAttempts: 1,
    });

    let error: unknown;
    try {
      await client.generateImage(imageRequest());
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({ name: "AbortError" });
    expect(error instanceof Error ? error.message : String(error)).not.toContain(
      apiKey,
    );
  });
});
