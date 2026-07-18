import { once } from "node:events";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import { YouTubePrivateUploadClient } from "../src/adapters/youtube-private-upload-client.js";
import { writeBinary } from "../src/core/file-system.js";
import type { YouTubeMetadata } from "../src/core/types.js";

interface TestServer {
  origin: string;
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
    throw new Error("YouTube test server did not expose a TCP address.");
  }
  origin = `http://127.0.0.1:${address.port}`;
  const testServer = {
    origin,
    close: async () => {
      server.close();
      await once(server, "close");
    },
  };
  openServers.push(testServer);
  return testServer;
}

function metadata(): YouTubeMetadata {
  return {
    schemaVersion: 1,
    level: "A1",
    title: "Memory | A1 English Listening",
    description: "Private integration upload.",
    tags: ["LingRoot", "A1 English"],
    categoryId: "27",
    privacyStatus: "private",
    madeForKids: false,
    isShort: true,
  };
}

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => server.close()));
});

describe("YouTubePrivateUploadClient", () => {
  it("refreshes OAuth and performs a private resumable upload", async () => {
    let tokenBody = "";
    let initiation: Record<string, unknown> | undefined;
    let initiationUrl = "";
    let uploaded = Buffer.alloc(0);
    const server = await startServer(async (request, response, origin) => {
      if (request.url === "/token") {
        tokenBody = (await readBody(request)).toString("utf8");
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            access_token: "temporary-access-token",
            expires_in: 3600,
            token_type: "Bearer",
          }),
        );
        return;
      }
      if (request.url?.startsWith("/upload/videos")) {
        initiationUrl = request.url;
        initiation = JSON.parse((await readBody(request)).toString("utf8"));
        response.statusCode = 200;
        response.setHeader("location", `${origin}/session`);
        response.end();
        return;
      }
      uploaded = await readBody(request);
      response.statusCode = 201;
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          id: "youtube-video-id",
          snippet: { title: metadata().title },
          status: { privacyStatus: "private" },
        }),
      );
    });
    const videoPath = "outputs/.tmp-youtube-tests/video.mp4";
    await writeBinary(videoPath, Buffer.from("video-bytes"));
    const client = new YouTubePrivateUploadClient({
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "refresh-token",
      tokenUrl: `${server.origin}/token`,
      uploadBaseUrl: `${server.origin}/upload`,
      maxAttempts: 1,
    });

    const result = await client.uploadPrivateVideo(videoPath, metadata());

    expect(tokenBody).toContain("grant_type=refresh_token");
    expect(tokenBody).toContain("refresh_token=refresh-token");
    expect(initiationUrl).toContain("notifySubscribers=false");
    expect(initiation).toMatchObject({
      status: {
        privacyStatus: "private",
        selfDeclaredMadeForKids: false,
      },
    });
    expect(uploaded.toString()).toBe("video-bytes");
    expect(result).toEqual({
      provider: "youtube",
      videoId: "youtube-video-id",
      privacyStatus: "private",
      title: metadata().title,
    });
  });

  it("queries upload progress and resumes after transient failure", async () => {
    let dataUploads = 0;
    let statusQueries = 0;
    const server = await startServer(async (request, response, origin) => {
      if (request.url === "/token") {
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ access_token: "access-token" }));
        return;
      }
      if (request.url?.startsWith("/upload/videos")) {
        await readBody(request);
        response.setHeader("location", `${origin}/session`);
        response.end();
        return;
      }
      const range = request.headers["content-range"];
      if (typeof range === "string" && range.startsWith("bytes */")) {
        statusQueries += 1;
        response.statusCode = 308;
        response.setHeader("range", "bytes=0-3");
        response.end();
        return;
      }
      dataUploads += 1;
      await readBody(request);
      if (dataUploads === 1) {
        response.statusCode = 503;
        response.end("temporary");
        return;
      }
      response.statusCode = 201;
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          id: "resumed-video",
          snippet: { title: metadata().title },
          status: { privacyStatus: "private" },
        }),
      );
    });
    const videoPath = "outputs/.tmp-youtube-tests/resume.mp4";
    await writeBinary(videoPath, Buffer.from("0123456789"));
    const client = new YouTubePrivateUploadClient({
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "refresh-token",
      tokenUrl: `${server.origin}/token`,
      uploadBaseUrl: `${server.origin}/upload`,
      maxAttempts: 2,
      sleep: async () => undefined,
    });

    const result = await client.uploadPrivateVideo(videoPath, metadata());

    expect(result.videoId).toBe("resumed-video");
    expect(dataUploads).toBe(2);
    expect(statusQueries).toBe(1);
  });

  it("rejects non-private metadata before OAuth or upload", async () => {
    const client = new YouTubePrivateUploadClient({
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "refresh-token",
      tokenUrl: "https://oauth.example.com/token",
      uploadBaseUrl: "https://upload.example.com",
    });
    const publicMetadata = { ...metadata(), privacyStatus: "public" as const };

    await expect(
      client.uploadPrivateVideo("outputs/unused.mp4", publicMetadata),
    ).rejects.toThrow("privacyStatus=private");
  });
});
