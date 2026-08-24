import { ExternalServiceError } from "../core/errors.js";
import { readBinary } from "../core/file-system.js";
import type { YouTubeMetadata, YouTubePrivacy } from "../core/types.js";
import { assertValid } from "../core/validators.js";
import type {
  YouTubeClient,
  YouTubePlaylistItemResult,
  YouTubePlaylistResult,
  YouTubeUploadResult,
} from "../services/youtube-client.js";

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const PLAYLIST_PROPAGATION_ATTEMPTS = 8;

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

interface YouTubeVideoResource {
  id?: string;
  snippet?: { title?: string };
  status?: { privacyStatus?: string };
}

export interface YouTubePrivateUploadClientOptions {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  tokenUrl?: string;
  uploadBaseUrl?: string;
  dataBaseUrl?: string;
  requestTimeoutMs?: number;
  maxAttempts?: number;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

function httpUrl(value: string, name: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ExternalServiceError(`${name} must be a valid URL.`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new ExternalServiceError(`${name} must use http or https.`);
  }
  return value.replace(/\/+$/, "");
}

function parseVideo(
  raw: unknown,
  expectedPrivacy: YouTubePrivacy,
): YouTubeVideoResource {
  if (!raw || typeof raw !== "object") {
    throw new ExternalServiceError(
      "YouTube upload returned an invalid video resource.",
    );
  }
  const video = raw as YouTubeVideoResource;
  if (typeof video.id !== "string" || video.id.length === 0) {
    throw new ExternalServiceError(
      "YouTube upload response is missing video ID.",
    );
  }
  if (video.status?.privacyStatus !== expectedPrivacy) {
    throw new ExternalServiceError(
      `YouTube video response is not ${expectedPrivacy}.`,
    );
  }
  return video;
}

export class YouTubePrivateUploadClient implements YouTubeClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly refreshToken: string;
  private readonly tokenUrl: string;
  private readonly uploadBaseUrl: string;
  private readonly dataBaseUrl: string;
  private readonly requestTimeoutMs: number;
  private readonly maxAttempts: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private cachedAccessToken: { value: string; expiresAt: number } | null = null;

  constructor(options: YouTubePrivateUploadClientOptions) {
    for (const [name, value] of [
      ["YOUTUBE_CLIENT_ID", options.clientId],
      ["YOUTUBE_CLIENT_SECRET", options.clientSecret],
      ["YOUTUBE_REFRESH_TOKEN", options.refreshToken],
    ]) {
      if (!value.trim()) {
        throw new ExternalServiceError(`${name} is required.`);
      }
    }
    if ((options.requestTimeoutMs ?? 60_000) <= 0) {
      throw new ExternalServiceError(
        "YouTube request timeout must be positive.",
      );
    }
    if ((options.maxAttempts ?? 4) < 1) {
      throw new ExternalServiceError(
        "YouTube maxAttempts must be at least 1.",
      );
    }
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.refreshToken = options.refreshToken;
    this.tokenUrl = httpUrl(
      options.tokenUrl ?? "https://oauth2.googleapis.com/token",
      "YOUTUBE_OAUTH_TOKEN_URL",
    );
    this.uploadBaseUrl = httpUrl(
      options.uploadBaseUrl ??
        "https://www.googleapis.com/upload/youtube/v3",
      "YOUTUBE_UPLOAD_BASE_URL",
    );
    this.dataBaseUrl = httpUrl(
      options.dataBaseUrl ?? "https://www.googleapis.com/youtube/v3",
      "YOUTUBE_DATA_API_BASE_URL",
    );
    this.requestTimeoutMs = options.requestTimeoutMs ?? 60_000;
    this.maxAttempts = options.maxAttempts ?? 4;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep =
      options.sleep ??
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.requestTimeoutMs,
    );
    try {
      return await this.fetchImpl(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async refreshAccessToken(): Promise<string> {
    if (
      this.cachedAccessToken &&
      this.cachedAccessToken.expiresAt > Date.now() + 60_000
    ) {
      return this.cachedAccessToken.value;
    }
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken,
      grant_type: "refresh_token",
    });
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(this.tokenUrl, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            accept: "application/json",
          },
          body,
        });
        if (!response.ok) {
          const retryable = RETRYABLE_STATUS_CODES.has(response.status);
          if (retryable && attempt < this.maxAttempts) {
            await this.sleep(Math.min(500 * 2 ** (attempt - 1), 4_000));
            continue;
          }
          throw new ExternalServiceError(
            `Google OAuth token refresh failed with HTTP ${response.status}.`,
            { statusCode: response.status, retryable },
          );
        }
        let raw: TokenResponse;
        try {
          raw = (await response.json()) as TokenResponse;
        } catch {
          throw new ExternalServiceError(
            "Google OAuth token endpoint returned invalid JSON.",
          );
        }
        if (
          typeof raw.access_token !== "string" ||
          raw.access_token.length === 0
        ) {
          throw new ExternalServiceError(
            "Google OAuth token response is missing access_token.",
          );
        }
        this.cachedAccessToken = {
          value: raw.access_token,
          expiresAt:
            Date.now() + Math.max((raw.expires_in ?? 3600) - 60, 60) * 1000,
        };
        return raw.access_token;
      } catch (error) {
        const retryable =
          error instanceof Error &&
          (error.name === "AbortError" || error instanceof TypeError);
        if (!retryable || attempt === this.maxAttempts) throw error;
        await this.sleep(Math.min(500 * 2 ** (attempt - 1), 4_000));
      }
    }
    throw new ExternalServiceError("Google OAuth token refresh failed.");
  }

  private async startSession(
    accessToken: string,
    bytes: number,
    metadata: YouTubeMetadata,
  ): Promise<string> {
    const body = JSON.stringify({
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: metadata.categoryId ?? "27",
      },
      status: {
        privacyStatus: "private",
        selfDeclaredMadeForKids: metadata.madeForKids ?? false,
        embeddable: true,
        license: "youtube",
      },
    });
    const response = await this.fetchWithTimeout(
      `${this.uploadBaseUrl}/videos?uploadType=resumable&part=snippet%2Cstatus&notifySubscribers=false`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json; charset=UTF-8",
          "content-length": String(Buffer.byteLength(body)),
          "x-upload-content-length": String(bytes),
          "x-upload-content-type": "video/mp4",
        },
        body,
      },
    );
    if (!response.ok) {
      throw new ExternalServiceError(
        `YouTube resumable session creation failed with HTTP ${response.status}.`,
        { statusCode: response.status },
      );
    }
    const location = response.headers.get("location");
    if (!location) {
      throw new ExternalServiceError(
        "YouTube resumable session response is missing Location.",
      );
    }
    return httpUrl(location, "YouTube resumable upload URL");
  }

  private offsetFromRange(value: string | null): number {
    if (!value) return 0;
    const match = /(?:bytes=)?0-(\d+)/.exec(value);
    return match ? Number(match[1]) + 1 : 0;
  }

  private async queryOffset(
    sessionUrl: string,
    accessToken: string,
    total: number,
  ): Promise<{ offset: number; completed?: YouTubeVideoResource }> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(sessionUrl, {
          method: "PUT",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-length": "0",
            "content-range": `bytes */${total}`,
          },
        });
        if (response.status === 308) {
          return {
            offset: this.offsetFromRange(response.headers.get("range")),
          };
        }
        if (response.ok) {
          return {
            offset: total,
            completed: parseVideo(await response.json(), "private"),
          };
        }
        if (
          !RETRYABLE_STATUS_CODES.has(response.status) ||
          attempt === this.maxAttempts
        ) {
          throw new ExternalServiceError(
            `YouTube resumable status query failed with HTTP ${response.status}.`,
            { statusCode: response.status },
          );
        }
      } catch (error) {
        const retryable =
          error instanceof Error &&
          (error.name === "AbortError" || error instanceof TypeError);
        if (!retryable || attempt === this.maxAttempts) throw error;
      }
      await this.sleep(Math.min(500 * 2 ** (attempt - 1), 4_000));
    }
    throw new ExternalServiceError(
      "YouTube resumable status query exceeded retry limit.",
    );
  }

  private async uploadBytes(
    sessionUrl: string,
    accessToken: string,
    video: Buffer,
  ): Promise<YouTubeVideoResource> {
    let offset = 0;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const chunk = video.subarray(offset);
      try {
        const response = await this.fetchWithTimeout(sessionUrl, {
          method: "PUT",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "video/mp4",
            "content-length": String(chunk.byteLength),
            "content-range": `bytes ${offset}-${video.byteLength - 1}/${video.byteLength}`,
          },
          body: new Blob([new Uint8Array(chunk)], {
            type: "video/mp4",
          }),
        });
        if (response.ok) {
          return parseVideo(await response.json(), "private");
        }
        if (response.status === 308) {
          offset = this.offsetFromRange(response.headers.get("range"));
          continue;
        }
        if (!RETRYABLE_STATUS_CODES.has(response.status)) {
          throw new ExternalServiceError(
            `YouTube video upload failed with HTTP ${response.status}.`,
            { statusCode: response.status },
          );
        }
      } catch (error) {
        const recoverable =
          error instanceof TypeError ||
          (error instanceof Error && error.name === "AbortError");
        if (!recoverable) throw error;
      }
      if (attempt === this.maxAttempts) break;
      await this.sleep(Math.min(1_000 * 2 ** (attempt - 1), 8_000));
      const status = await this.queryOffset(
        sessionUrl,
        accessToken,
        video.byteLength,
      );
      if (status.completed) return status.completed;
      offset = status.offset;
    }
    throw new ExternalServiceError(
      "YouTube resumable upload exceeded retry limit.",
    );
  }

  async uploadPrivateVideo(
    videoPath: string,
    metadataInput: YouTubeMetadata,
  ): Promise<YouTubeUploadResult> {
    const metadata = assertValid("youtube-metadata", metadataInput);
    if (metadata.privacyStatus !== "private") {
      throw new ExternalServiceError(
        "YouTube private upload requires privacyStatus=private.",
      );
    }
    const video = await readBinary(videoPath);
    if (video.byteLength === 0) {
      throw new ExternalServiceError("YouTube video file is empty.");
    }
    const accessToken = await this.refreshAccessToken();
    const sessionUrl = await this.startSession(
      accessToken,
      video.byteLength,
      metadata,
    );
    const uploaded = await this.uploadBytes(sessionUrl, accessToken, video);
    return {
      provider: "youtube",
      videoId: uploaded.id as string,
      privacyStatus: "private",
      title: uploaded.snippet?.title ?? metadata.title,
    };
  }

  async updateVideoMetadata(
    videoId: string,
    metadataInput: YouTubeMetadata,
  ): Promise<YouTubeUploadResult> {
    const metadata = assertValid("youtube-metadata", metadataInput);
    if (!videoId.trim()) {
      throw new ExternalServiceError("YouTube video ID is required.");
    }
    const accessToken = await this.refreshAccessToken();
    const updated = (await this.youtubeJson(
      `${this.dataBaseUrl}/videos?part=snippet%2Cstatus`,
      accessToken,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: videoId,
          snippet: {
            title: metadata.title,
            description: metadata.description,
            tags: metadata.tags,
            categoryId: metadata.categoryId ?? "27",
          },
          status: {
            privacyStatus: metadata.privacyStatus,
            selfDeclaredMadeForKids: metadata.madeForKids ?? false,
            embeddable: true,
            license: "youtube",
          },
        }),
      },
      false,
    )) as YouTubeVideoResource;
    const video = parseVideo(updated, metadata.privacyStatus);
    if (video.id !== videoId) {
      throw new ExternalServiceError(
        "YouTube metadata update returned a different video ID.",
      );
    }
    return {
      provider: "youtube",
      videoId,
      privacyStatus: metadata.privacyStatus,
      title: video.snippet?.title ?? metadata.title,
    };
  }

  private async youtubeJson(
    url: string,
    accessToken: string,
    init: RequestInit,
    retry: boolean,
  ): Promise<unknown> {
    const attempts = retry ? this.maxAttempts : 1;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(url, {
          ...init,
          headers: {
            authorization: `Bearer ${accessToken}`,
            accept: "application/json",
            ...(init.headers as Record<string, string> | undefined),
          },
        });
        if (!response.ok) {
          if (
            retry &&
            RETRYABLE_STATUS_CODES.has(response.status) &&
            attempt < attempts
          ) {
            await this.sleep(Math.min(500 * 2 ** (attempt - 1), 4_000));
            continue;
          }
          let reason = "";
          try {
            const errorBody = (await response.clone().json()) as {
              error?: {
                message?: string;
                errors?: Array<{ reason?: string }>;
              };
            };
            reason =
              errorBody.error?.errors?.[0]?.reason ??
              errorBody.error?.message ??
              "";
          } catch {
            // Some provider errors are not JSON; status and endpoint remain enough.
          }
          const endpoint = new URL(url).pathname;
          throw new ExternalServiceError(
            `YouTube Data API ${init.method ?? "GET"} ${endpoint} failed with HTTP ${response.status}${reason ? ` (${reason})` : ""}.`,
            { statusCode: response.status },
          );
        }
        try {
          return await response.json();
        } catch {
          throw new ExternalServiceError(
            "YouTube Data API returned invalid JSON.",
          );
        }
      } catch (error) {
        const recoverable =
          retry &&
          error instanceof Error &&
          (error.name === "AbortError" || error instanceof TypeError);
        if (!recoverable || attempt === attempts) throw error;
        await this.sleep(Math.min(500 * 2 ** (attempt - 1), 4_000));
      }
    }
    throw new ExternalServiceError("YouTube Data API request failed.");
  }

  async ensurePlaylist(
    titleInput: string,
    description: string,
    privacyStatus: YouTubePrivacy,
  ): Promise<YouTubePlaylistResult> {
    const title = titleInput.trim();
    if (!title) throw new ExternalServiceError("Playlist title is required.");
    const accessToken = await this.refreshAccessToken();
    let pageToken: string | undefined;
    do {
      const query = new URLSearchParams({
        part: "snippet,status",
        mine: "true",
        maxResults: "50",
      });
      if (pageToken) query.set("pageToken", pageToken);
      const raw = (await this.youtubeJson(
        `${this.dataBaseUrl}/playlists?${query}`,
        accessToken,
        { method: "GET" },
        true,
      )) as {
        nextPageToken?: string;
        items?: Array<{
          id?: string;
          snippet?: { title?: string };
          status?: { privacyStatus?: string };
        }>;
      };
      const found = raw.items?.find(
        (item) => item.snippet?.title === title,
      );
      if (found) {
        if (!found.id) {
          throw new ExternalServiceError(
            "YouTube playlist response is missing ID.",
          );
        }
        if (found.status?.privacyStatus !== privacyStatus) {
          if (privacyStatus === "public") {
            return this.setPlaylistPrivacy(found.id, privacyStatus);
          }
          throw new ExternalServiceError(
            `Existing playlist "${title}" is not ${privacyStatus}.`,
          );
        }
        return {
          playlistId: found.id,
          title,
          privacyStatus,
          created: false,
        };
      }
      pageToken = raw.nextPageToken;
    } while (pageToken);

    const created = (await this.youtubeJson(
      `${this.dataBaseUrl}/playlists?part=snippet%2Cstatus`,
      accessToken,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          snippet: { title, description },
          status: { privacyStatus },
        }),
      },
      false,
    )) as {
      id?: string;
      snippet?: { title?: string };
      status?: { privacyStatus?: string };
    };
    if (
      !created.id ||
      created.status?.privacyStatus !== privacyStatus
    ) {
      throw new ExternalServiceError(
        `YouTube playlist creation returned an invalid ${privacyStatus} playlist.`,
      );
    }
    return {
      playlistId: created.id,
      title: created.snippet?.title ?? title,
      privacyStatus,
      created: true,
    };
  }

  async setPlaylistPrivacy(
    playlistId: string,
    privacyStatus: YouTubePrivacy,
  ): Promise<YouTubePlaylistResult> {
    if (!playlistId.trim()) {
      throw new ExternalServiceError("Playlist ID is required.");
    }
    const accessToken = await this.refreshAccessToken();
    const query = new URLSearchParams({
      part: "snippet,status",
      id: playlistId,
      maxResults: "1",
    });
    const raw = (await this.youtubeJson(
      `${this.dataBaseUrl}/playlists?${query}`,
      accessToken,
      { method: "GET" },
      true,
    )) as {
      items?: Array<{
        id?: string;
        snippet?: {
          title?: string;
          description?: string;
          defaultLanguage?: string;
        };
        status?: { privacyStatus?: string; podcastStatus?: string };
      }>;
    };
    const playlist = raw.items?.[0];
    if (!playlist?.id || !playlist.snippet?.title) {
      throw new ExternalServiceError("YouTube playlist was not found.", {
        statusCode: 404,
      });
    }
    if (playlist.status?.privacyStatus === privacyStatus) {
      return {
        playlistId,
        title: playlist.snippet.title,
        privacyStatus,
        created: false,
      };
    }
    const snippet: Record<string, string> = {
      title: playlist.snippet.title,
      description: playlist.snippet.description ?? "",
    };
    if (playlist.snippet.defaultLanguage) {
      snippet.defaultLanguage = playlist.snippet.defaultLanguage;
    }
    const status: Record<string, string> = { privacyStatus };
    if (playlist.status?.podcastStatus) {
      status.podcastStatus = playlist.status.podcastStatus;
    }
    const updated = (await this.youtubeJson(
      `${this.dataBaseUrl}/playlists?part=snippet%2Cstatus`,
      accessToken,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: playlistId, snippet, status }),
      },
      false,
    )) as {
      id?: string;
      snippet?: { title?: string };
      status?: { privacyStatus?: string };
    };
    if (
      updated.id !== playlistId ||
      updated.status?.privacyStatus !== privacyStatus
    ) {
      throw new ExternalServiceError(
        `YouTube playlist update did not return ${privacyStatus} status.`,
      );
    }
    return {
      playlistId,
      title: updated.snippet?.title ?? playlist.snippet.title,
      privacyStatus,
      created: false,
    };
  }

  async addVideoToPlaylist(
    playlistId: string,
    videoId: string,
  ): Promise<YouTubePlaylistItemResult> {
    if (!playlistId.trim() || !videoId.trim()) {
      throw new ExternalServiceError(
        "playlistId and videoId are required.",
      );
    }
    const accessToken = await this.refreshAccessToken();
    for (
      let propagationAttempt = 1;
      propagationAttempt <= PLAYLIST_PROPAGATION_ATTEMPTS;
      propagationAttempt += 1
    ) {
      try {
        const query = new URLSearchParams({
          part: "id",
          playlistId,
          videoId,
          maxResults: "1",
        });
        const existing = (await this.youtubeJson(
          `${this.dataBaseUrl}/playlistItems?${query}`,
          accessToken,
          { method: "GET" },
          true,
        )) as { items?: Array<{ id?: string }> };
        if ((existing.items?.length ?? 0) > 0) {
          return {
            playlistId,
            videoId,
            inserted: false,
            playlistItemId: existing.items?.[0]?.id,
          };
        }
        const inserted = (await this.youtubeJson(
          `${this.dataBaseUrl}/playlistItems?part=snippet`,
          accessToken,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              snippet: {
                playlistId,
                resourceId: {
                  kind: "youtube#video",
                  videoId,
                },
              },
            }),
          },
          false,
        )) as { id?: string };
        if (!inserted.id) {
          throw new ExternalServiceError(
            "YouTube playlist item response is missing ID.",
          );
        }
        return {
          playlistId,
          videoId,
          inserted: true,
          playlistItemId: inserted.id,
        };
      } catch (error) {
        const propagationPending =
          error instanceof ExternalServiceError && error.statusCode === 404;
        if (
          !propagationPending ||
          propagationAttempt === PLAYLIST_PROPAGATION_ATTEMPTS
        ) {
          throw error;
        }
        await this.sleep(2_000);
      }
    }
    throw new ExternalServiceError(
      "YouTube playlist did not become visible before the retry limit.",
    );
  }
}
