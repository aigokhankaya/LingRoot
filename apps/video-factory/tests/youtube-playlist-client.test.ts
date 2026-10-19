import { once } from "node:events";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import { YouTubePrivateUploadClient } from "../src/adapters/youtube-private-upload-client.js";

interface TestServer {
  origin: string;
  close(): Promise<void>;
}

const openServers: TestServer[] = [];

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
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
    throw new Error("YouTube playlist test server has no TCP address.");
  }
  const testServer = {
    origin: `http://127.0.0.1:${address.port}`,
    close: async () => {
      server.close();
      await once(server, "close");
    },
  };
  openServers.push(testServer);
  return testServer;
}

function json(response: ServerResponse, body: unknown): void {
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(body));
}

function client(origin: string): YouTubePrivateUploadClient {
  return new YouTubePrivateUploadClient({
    clientId: "client-id",
    clientSecret: "client-secret",
    refreshToken: "refresh-token",
    tokenUrl: `${origin}/token`,
    dataBaseUrl: `${origin}/data`,
    maxAttempts: 1,
  });
}

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => server.close()));
});

describe("YouTubePrivateUploadClient playlists", () => {
  it("waits for a newly created playlist to become visible", async () => {
    let itemChecks = 0;
    let itemCreates = 0;
    const server = await startServer(async (request, response) => {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.pathname === "/token") {
        json(response, { access_token: "token", expires_in: 3600 });
        return;
      }
      if (url.pathname === "/data/playlistItems" && request.method === "GET") {
        itemChecks += 1;
        if (itemChecks === 1) {
          response.statusCode = 404;
          json(response, {
            error: { errors: [{ reason: "playlistNotFound" }] },
          });
          return;
        }
        json(response, { items: [] });
        return;
      }
      if (url.pathname === "/data/playlistItems" && request.method === "POST") {
        itemCreates += 1;
        json(response, { id: "new-item" });
        return;
      }
      response.statusCode = 404;
      response.end();
    });
    const youtube = new YouTubePrivateUploadClient({
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "refresh-token",
      tokenUrl: `${server.origin}/token`,
      dataBaseUrl: `${server.origin}/data`,
      maxAttempts: 1,
      sleep: async () => undefined,
    });

    await expect(
      youtube.addVideoToPlaylist("new-playlist", "new-video"),
    ).resolves.toMatchObject({ inserted: true, playlistItemId: "new-item" });
    expect(itemChecks).toBe(2);
    expect(itemCreates).toBe(1);
  });

  it("publishes a playlist while preserving its snippet", async () => {
    let updateBody: unknown;
    const server = await startServer(async (request, response) => {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.pathname === "/token") {
        json(response, { access_token: "token", expires_in: 3600 });
        return;
      }
      if (url.pathname === "/data/playlists" && request.method === "GET") {
        expect(url.searchParams.get("id")).toBe("playlist-id");
        json(response, {
          items: [{
            id: "playlist-id",
            snippet: { title: "Memory", description: "Topic videos." },
            status: { privacyStatus: "private" },
          }],
        });
        return;
      }
      if (url.pathname === "/data/playlists" && request.method === "PUT") {
        updateBody = JSON.parse(await readBody(request));
        json(response, {
          id: "playlist-id",
          snippet: { title: "Memory" },
          status: { privacyStatus: "public" },
        });
        return;
      }
      response.statusCode = 404;
      response.end();
    });

    await expect(
      client(server.origin).setPlaylistPrivacy("playlist-id", "public"),
    ).resolves.toMatchObject({
      playlistId: "playlist-id",
      privacyStatus: "public",
      created: false,
    });
    expect(updateBody).toEqual({
      id: "playlist-id",
      snippet: { title: "Memory", description: "Topic videos." },
      status: { privacyStatus: "public" },
    });
  });

  it("finds or creates private playlists and inserts videos idempotently", async () => {
    let tokenRequests = 0;
    let playlistCreates = 0;
    let itemCreates = 0;
    let createdPlaylistBody: unknown;
    let insertedItemBody: unknown;
    const server = await startServer(async (request, response) => {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.pathname === "/token") {
        tokenRequests += 1;
        json(response, {
          access_token: "temporary-access-token",
          expires_in: 3600,
        });
        return;
      }
      expect(request.headers.authorization).toBe(
        "Bearer temporary-access-token",
      );
      if (url.pathname === "/data/playlists" && request.method === "GET") {
        expect(url.searchParams.get("mine")).toBe("true");
        expect(url.searchParams.get("maxResults")).toBe("50");
        if (!url.searchParams.has("pageToken")) {
          json(response, {
            nextPageToken: "page-2",
            items: [
              {
                id: "other-playlist",
                snippet: { title: "Other" },
                status: { privacyStatus: "private" },
              },
            ],
          });
          return;
        }
        json(response, {
          items: [
            {
              id: "topic-playlist",
              snippet: { title: "Memory | All Levels" },
              status: { privacyStatus: "private" },
            },
          ],
        });
        return;
      }
      if (url.pathname === "/data/playlists" && request.method === "POST") {
        playlistCreates += 1;
        createdPlaylistBody = JSON.parse(await readBody(request));
        json(response, {
          id: "level-playlist",
          snippet: { title: "A1 English Listening" },
          status: { privacyStatus: "private" },
        });
        return;
      }
      if (
        url.pathname === "/data/playlistItems" &&
        request.method === "GET"
      ) {
        expect(url.searchParams.get("playlistId")).toBeTruthy();
        expect(url.searchParams.get("videoId")).toBeTruthy();
        json(
          response,
          url.searchParams.get("videoId") === "existing-video"
            ? { items: [{ id: "existing-item" }] }
            : { items: [] },
        );
        return;
      }
      if (
        url.pathname === "/data/playlistItems" &&
        request.method === "POST"
      ) {
        itemCreates += 1;
        insertedItemBody = JSON.parse(await readBody(request));
        json(response, { id: "new-playlist-item" });
        return;
      }
      response.statusCode = 404;
      response.end();
    });
    const youtube = client(server.origin);

    const topic = await youtube.ensurePlaylist(
      "Memory | All Levels",
      "Topic videos.",
      "private",
    );
    const level = await youtube.ensurePlaylist(
      "A1 English Listening",
      "Level videos.",
      "private",
    );
    const duplicate = await youtube.addVideoToPlaylist(
      topic.playlistId,
      "existing-video",
    );
    const inserted = await youtube.addVideoToPlaylist(
      level.playlistId,
      "new-video",
    );

    expect(topic).toEqual({
      playlistId: "topic-playlist",
      title: "Memory | All Levels",
      privacyStatus: "private",
      created: false,
    });
    expect(level).toEqual({
      playlistId: "level-playlist",
      title: "A1 English Listening",
      privacyStatus: "private",
      created: true,
    });
    expect(createdPlaylistBody).toEqual({
      snippet: {
        title: "A1 English Listening",
        description: "Level videos.",
      },
      status: { privacyStatus: "private" },
    });
    expect(duplicate).toEqual({
      playlistId: "topic-playlist",
      videoId: "existing-video",
      inserted: false,
      playlistItemId: "existing-item",
    });
    expect(inserted).toEqual({
      playlistId: "level-playlist",
      videoId: "new-video",
      inserted: true,
      playlistItemId: "new-playlist-item",
    });
    expect(insertedItemBody).toEqual({
      snippet: {
        playlistId: "level-playlist",
        resourceId: {
          kind: "youtube#video",
          videoId: "new-video",
        },
      },
    });
    expect(tokenRequests).toBe(1);
    expect(playlistCreates).toBe(1);
    expect(itemCreates).toBe(1);
  });

  it("rejects an existing playlist with the same title when it is not private", async () => {
    const server = await startServer(async (request, response) => {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.pathname === "/token") {
        json(response, { access_token: "token", expires_in: 3600 });
        return;
      }
      json(response, {
        items: [
          {
            id: "public-playlist",
            snippet: { title: "A1 English Listening" },
            status: { privacyStatus: "public" },
          },
        ],
      });
    });

    await expect(
      client(server.origin).ensurePlaylist(
        "A1 English Listening",
        "Level videos.",
        "private",
      ),
    ).rejects.toThrow('Existing playlist "A1 English Listening" is not private');
  });
});
