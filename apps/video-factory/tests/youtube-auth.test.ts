import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildYouTubeAuthorizationUrl,
  fetchAuthorizedYouTubeChannel,
  parseDesktopClientJson,
  writeYouTubeCredentialsToEnv,
  YOUTUBE_FORCE_SSL_SCOPE,
} from "../src/services/youtube-oauth.js";

describe("YouTube OAuth setup", () => {
  it("accepts only a Desktop OAuth client", () => {
    expect(
      parseDesktopClientJson(
        JSON.stringify({
          installed: {
            client_id: "client-id",
            client_secret: "client-secret",
          },
        }),
      ),
    ).toMatchObject({ clientId: "client-id", clientSecret: "client-secret" });
    expect(() =>
      parseDesktopClientJson(
        JSON.stringify({ web: { client_id: "web-client" } }),
      ),
    ).toThrow(/Desktop app/);
  });

  it("builds an offline PKCE authorization request with playlist scope", () => {
    const url = new URL(
      buildYouTubeAuthorizationUrl({
        authUri: "https://accounts.google.com/o/oauth2/v2/auth",
        clientId: "client-id",
        redirectUri: "http://127.0.0.1:12345/oauth2callback",
        state: "state",
        codeChallenge: "challenge",
      }),
    );
    expect(url.searchParams.get("scope")).toBe(YOUTUBE_FORCE_SSL_SCOPE);
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("updates only YouTube keys and restricts env file permissions", async () => {
    const directory = await mkdtemp(join(tmpdir(), "lingroot-youtube-auth-"));
    const envPath = join(directory, ".env");
    await writeFile(
      envPath,
      "DRY_RUN=false\nYOUTUBE_CLIENT_ID=old\nYOUTUBE_CLIENT_SECRET=\n",
    );
    await writeYouTubeCredentialsToEnv({
      envPath,
      clientId: "new-id",
      clientSecret: "new-secret",
      refreshToken: "refresh-token",
    });
    const result = await readFile(envPath, "utf8");
    expect(result).toContain("DRY_RUN=false");
    expect(result).toContain("YOUTUBE_CLIENT_ID=new-id");
    expect(result).toContain("YOUTUBE_CLIENT_SECRET=new-secret");
    expect(result).toContain("YOUTUBE_REFRESH_TOKEN=refresh-token");
    expect((await stat(envPath)).mode & 0o777).toBe(0o600);
  });

  it("reports the authorized channel without exposing tokens", async () => {
    const channel = await fetchAuthorizedYouTubeChannel({
      accessToken: "access-token",
      fetchImpl: async (_url, init) => {
        expect((init?.headers as Record<string, string>).authorization).toBe(
          "Bearer access-token",
        );
        return new Response(
          JSON.stringify({
            items: [{ id: "channel-id", snippet: { title: "LingRoot" } }],
          }),
          { status: 200 },
        );
      },
    });
    expect(channel).toEqual({ channelId: "channel-id", title: "LingRoot" });
  });
});
