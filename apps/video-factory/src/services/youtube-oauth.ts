import { createHash, randomBytes } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";

import { ConfigError, ExternalServiceError } from "../core/errors.js";

export const YOUTUBE_FORCE_SSL_SCOPE =
  "https://www.googleapis.com/auth/youtube.force-ssl";

export interface YouTubeDesktopCredentials {
  clientId: string;
  clientSecret: string;
  authUri: string;
  tokenUri: string;
}

export interface YouTubeTokenResult {
  accessToken: string;
  refreshToken: string;
  scopes: string[];
}

export interface AuthorizedYouTubeChannel {
  channelId: string;
  title: string;
}

interface DesktopClientJson {
  installed?: {
    client_id?: string;
    client_secret?: string;
    auth_uri?: string;
    token_uri?: string;
  };
  web?: unknown;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export function parseDesktopClientJson(raw: string): YouTubeDesktopCredentials {
  let parsed: DesktopClientJson;
  try {
    parsed = JSON.parse(raw) as DesktopClientJson;
  } catch {
    throw new ConfigError("OAuth client JSON is not valid JSON.");
  }
  if (!parsed.installed) {
    if (parsed.web) {
      throw new ConfigError(
        "OAuth client must be a Google Cloud Desktop app, not a Web application.",
      );
    }
    throw new ConfigError(
      "OAuth client JSON is missing the installed application section.",
    );
  }
  const clientId = parsed.installed.client_id?.trim() ?? "";
  const clientSecret = parsed.installed.client_secret?.trim() ?? "";
  if (!clientId || !clientSecret) {
    throw new ConfigError(
      "OAuth client JSON is missing client_id or client_secret.",
    );
  }
  return {
    clientId,
    clientSecret,
    authUri:
      parsed.installed.auth_uri?.trim() ||
      "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUri:
      parsed.installed.token_uri?.trim() ||
      "https://oauth2.googleapis.com/token",
  };
}

export async function readDesktopClientJson(
  path: string,
): Promise<YouTubeDesktopCredentials> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    throw new ConfigError(
      `Could not read OAuth client JSON: ${(error as Error).message}`,
    );
  }
  return parseDesktopClientJson(raw);
}

export function createPkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(64).toString("base64url");
  return {
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
}

export function createOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function buildYouTubeAuthorizationUrl(input: {
  authUri: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(input.authUri);
  url.search = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: YOUTUBE_FORCE_SSL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

export async function exchangeYouTubeAuthorizationCode(input: {
  credentials: YouTubeDesktopCredentials;
  code: string;
  redirectUri: string;
  codeVerifier: string;
  fetchImpl?: typeof fetch;
}): Promise<YouTubeTokenResult> {
  const response = await (input.fetchImpl ?? fetch)(input.credentials.tokenUri, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: input.credentials.clientId,
      client_secret: input.credentials.clientSecret,
      code: input.code,
      code_verifier: input.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: input.redirectUri,
    }),
  });
  let body: TokenResponse;
  try {
    body = (await response.json()) as TokenResponse;
  } catch {
    throw new ExternalServiceError(
      `Google OAuth token exchange returned invalid JSON (HTTP ${response.status}).`,
    );
  }
  if (!response.ok) {
    throw new ExternalServiceError(
      `Google OAuth token exchange failed: ${body.error_description || body.error || `HTTP ${response.status}`}.`,
      { statusCode: response.status },
    );
  }
  if (!body.access_token || !body.refresh_token) {
    throw new ExternalServiceError(
      "Google OAuth response did not include access_token and refresh_token. Revoke the previous grant and run youtube:auth again.",
    );
  }
  const scopes = (body.scope ?? "").split(/\s+/).filter(Boolean);
  if (!scopes.includes(YOUTUBE_FORCE_SSL_SCOPE)) {
    throw new ExternalServiceError(
      "Google OAuth did not grant the required youtube.force-ssl scope.",
    );
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    scopes,
  };
}

export async function fetchAuthorizedYouTubeChannel(input: {
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<AuthorizedYouTubeChannel> {
  const response = await (input.fetchImpl ?? fetch)(
    "https://www.googleapis.com/youtube/v3/channels?part=id%2Csnippet&mine=true&maxResults=1",
    {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${input.accessToken}`,
      },
    },
  );
  let body: {
    items?: Array<{ id?: string; snippet?: { title?: string } }>;
    error?: { message?: string };
  };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    throw new ExternalServiceError(
      `YouTube channel check returned invalid JSON (HTTP ${response.status}).`,
    );
  }
  if (!response.ok) {
    throw new ExternalServiceError(
      `YouTube channel check failed: ${body.error?.message || `HTTP ${response.status}`}.`,
      { statusCode: response.status },
    );
  }
  const channel = body.items?.[0];
  if (!channel?.id || !channel.snippet?.title) {
    throw new ExternalServiceError(
      "The authorized Google account does not expose a YouTube channel.",
    );
  }
  return { channelId: channel.id, title: channel.snippet.title };
}

function envLine(key: string, value: string): string {
  if (/[\r\n]/.test(value)) {
    throw new ConfigError(`${key} contains an invalid newline.`);
  }
  return `${key}=${value}`;
}

export async function writeYouTubeCredentialsToEnv(input: {
  envPath: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<void> {
  let raw = "";
  try {
    raw = await readFile(input.envPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const values: Record<string, string> = {
    YOUTUBE_CLIENT_ID: input.clientId,
    YOUTUBE_CLIENT_SECRET: input.clientSecret,
    YOUTUBE_REFRESH_TOKEN: input.refreshToken,
  };
  const found = new Set<string>();
  const lines = raw.split(/\r?\n/).map((line) => {
    const match = /^(YOUTUBE_CLIENT_ID|YOUTUBE_CLIENT_SECRET|YOUTUBE_REFRESH_TOKEN)=/.exec(
      line,
    );
    if (!match) return line;
    found.add(match[1]);
    return envLine(match[1], values[match[1]]);
  });
  for (const [key, value] of Object.entries(values)) {
    if (!found.has(key)) lines.push(envLine(key, value));
  }
  const output = `${lines.join("\n").replace(/\n+$/, "")}\n`;
  await writeFile(input.envPath, output, { encoding: "utf8", mode: 0o600 });
  await chmod(input.envPath, 0o600);
}
