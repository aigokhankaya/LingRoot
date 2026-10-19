import { once } from "node:events";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import { SupabaseStorageClient } from "../src/adapters/supabase-storage-client.js";

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
    throw new Error("Storage test server did not expose a TCP address.");
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

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => server.close()));
});

describe("SupabaseStorageClient", () => {
  it("uploads, downloads and removes a private object", async () => {
    const storedContent = Buffer.from("same topic. your level.");
    const requests: Array<{
      method?: string;
      url?: string;
      body: string;
      authorization?: string;
      apiKey?: string;
      upsert?: string;
    }> = [];
    const server = await startServer(async (request, response) => {
      const body = await readBody(request);
      requests.push({
        method: request.method,
        url: request.url,
        body: body.toString("utf8"),
        authorization: request.headers.authorization,
        apiKey: request.headers.apikey as string | undefined,
        upsert: request.headers["x-upsert"] as string | undefined,
      });
      if (request.method === "POST") {
        response.setHeader("etag", '"storage-etag"');
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            Id: "object-id",
            Key: "private-assets/folder/hello world.txt",
          }),
        );
        return;
      }
      if (request.method === "GET") {
        response.end(storedContent);
        return;
      }
      response.setHeader("content-type", "application/json");
      response.end("[]");
    });
    const client = new SupabaseStorageClient({
      supabaseUrl: server.baseUrl,
      serviceRoleKey: "test-service-role-key",
      bucket: "private-assets",
      maxAttempts: 1,
    });

    const stored = await client.store("folder/hello world.txt", storedContent, {
      contentType: "text/plain",
      upsert: true,
    });
    const downloaded = await client.retrieve("folder/hello world.txt");
    await client.remove("folder/hello world.txt");

    expect(stored.path).toBe(
      "supabase://private-assets/folder/hello world.txt",
    );
    expect(stored.etag).toBe('"storage-etag"');
    expect(downloaded).toEqual(storedContent);
    expect(requests.map((item) => item.method)).toEqual([
      "POST",
      "GET",
      "DELETE",
    ]);
    expect(requests[0].url).toBe(
      "/storage/v1/object/private-assets/folder/hello%20world.txt",
    );
    expect(requests[0].authorization).toBe(
      "Bearer test-service-role-key",
    );
    expect(requests[0].apiKey).toBe("test-service-role-key");
    expect(requests[0].upsert).toBe("true");
    expect(JSON.parse(requests[2].body)).toEqual({
      prefixes: ["folder/hello world.txt"],
    });
  });

  it("retries idempotent downloads", async () => {
    let attempts = 0;
    const server = await startServer(async (_request, response) => {
      attempts += 1;
      if (attempts === 1) {
        response.statusCode = 503;
        response.end("temporarily unavailable");
        return;
      }
      response.end("retrieved");
    });
    const client = new SupabaseStorageClient({
      supabaseUrl: server.baseUrl,
      serviceRoleKey: "test-key",
      bucket: "assets",
      maxAttempts: 2,
      sleep: async () => undefined,
    });

    expect((await client.retrieve("folder/file.txt")).toString()).toBe(
      "retrieved",
    );
    expect(attempts).toBe(2);
  });

  it("creates a short-lived signed URL without exposing credentials", async () => {
    let body: unknown;
    const server = await startServer(async (request, response) => {
      body = JSON.parse((await readBody(request)).toString("utf8"));
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          signedURL:
            "/object/sign/private-assets/folder/image.png?token=signed-token",
        }),
      );
    });
    const client = new SupabaseStorageClient({
      supabaseUrl: server.baseUrl,
      serviceRoleKey: "service-role-secret",
      bucket: "private-assets",
    });

    const url = await client.createSignedReadUrl(
      "folder/image.png",
      900,
    );

    expect(body).toEqual({ expiresIn: 900 });
    expect(url).toBe(
      `${server.baseUrl}/storage/v1/object/sign/private-assets/folder/image.png?token=signed-token`,
    );
    expect(url).not.toContain("service-role-secret");
  });

  it("does not retry non-upsert uploads", async () => {
    let attempts = 0;
    const server = await startServer(async (_request, response) => {
      attempts += 1;
      response.statusCode = 503;
      response.end("temporarily unavailable");
    });
    const client = new SupabaseStorageClient({
      supabaseUrl: server.baseUrl,
      serviceRoleKey: "test-key",
      bucket: "assets",
      maxAttempts: 3,
      sleep: async () => undefined,
    });

    await expect(
      client.store("folder/file.txt", "content", { upsert: false }),
    ).rejects.toThrow("HTTP 503");
    expect(attempts).toBe(1);
  });

  it("rejects traversal keys before making a request", async () => {
    const client = new SupabaseStorageClient({
      supabaseUrl: "https://project.supabase.co",
      serviceRoleKey: "test-key",
      bucket: "assets",
    });

    await expect(client.retrieve("../secret.txt")).rejects.toThrow(
      "Invalid storage key",
    );
  });

  it("does not expose the service-role key in errors", async () => {
    const server = await startServer(async (_request, response) => {
      response.statusCode = 401;
      response.end("invalid service role key");
    });
    const serviceRoleKey = "sensitive-service-role-key";
    const client = new SupabaseStorageClient({
      supabaseUrl: server.baseUrl,
      serviceRoleKey,
      bucket: "assets",
      maxAttempts: 1,
    });

    let message = "";
    try {
      await client.retrieve("folder/file.txt");
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("HTTP 401");
    expect(message).not.toContain(serviceRoleKey);
  });
});
