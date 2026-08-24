import { createServer, type ServerResponse } from "node:http";

import { getLogger, resolvePath } from "../core/index.js";
import {
  buildYouTubeAuthorizationUrl,
  createOAuthState,
  createPkce,
  exchangeYouTubeAuthorizationCode,
  fetchAuthorizedYouTubeChannel,
  readDesktopClientJson,
  writeYouTubeCredentialsToEnv,
} from "../services/youtube-oauth.js";
import { parseArgs } from "./args.js";

const logger = getLogger("youtube-auth");

function html(response: ServerResponse, status: number, message: string): void {
  response.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(
    `<!doctype html><html lang="tr"><meta charset="utf-8"><title>LingRoot YouTube</title><body><h1>${message}</h1><p>Bu pencereyi kapatıp terminale dönebilirsiniz.</p></body></html>`,
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const clientJson =
    typeof args["client-json"] === "string" ? args["client-json"] : "";
  if (!clientJson) {
    throw new Error(
      "--client-json is required. Download a Desktop app OAuth client JSON from Google Cloud first.",
    );
  }
  const credentials = await readDesktopClientJson(resolvePath(clientJson));
  const state = createOAuthState();
  const pkce = createPkce();

  let finish!: (value: string) => void;
  let fail!: (reason: Error) => void;
  const authorizationCode = new Promise<string>((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    if (requestUrl.pathname !== "/oauth2callback") {
      html(response, 404, "Geçersiz OAuth callback");
      return;
    }
    if (requestUrl.searchParams.get("state") !== state) {
      html(response, 400, "OAuth state doğrulanamadı");
      fail(new Error("OAuth callback state mismatch."));
      return;
    }
    const error = requestUrl.searchParams.get("error");
    const code = requestUrl.searchParams.get("code");
    if (error || !code) {
      html(response, 400, "YouTube yetkilendirmesi tamamlanmadı");
      fail(new Error(`Google OAuth authorization failed: ${error || "missing code"}.`));
      return;
    }
    html(response, 200, "YouTube yetkilendirmesi alındı");
    finish(code);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not start the local OAuth callback server.");
  }
  const redirectUri = `http://127.0.0.1:${address.port}/oauth2callback`;
  const authorizationUrl = buildYouTubeAuthorizationUrl({
    authUri: credentials.authUri,
    clientId: credentials.clientId,
    redirectUri,
    state,
    codeChallenge: pkce.challenge,
  });
  process.stdout.write(
    `\nYouTube kanalını yöneten Google hesabıyla aşağıdaki adresi açın ve izin verin:\n\n${authorizationUrl}\n\nCallback en fazla 5 dakika beklenecek.\n`,
  );
  const timeout = setTimeout(() => {
    fail(new Error("OAuth callback timed out after 5 minutes."));
    server.close();
  }, 5 * 60_000);
  try {
    const code = await authorizationCode;
    const token = await exchangeYouTubeAuthorizationCode({
      credentials,
      code,
      redirectUri,
      codeVerifier: pkce.verifier,
    });
    const envPath = resolvePath(".env");
    await writeYouTubeCredentialsToEnv({
      envPath,
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      refreshToken: token.refreshToken,
    });
    logger.info("YouTube OAuth credentials saved securely.", {
      envPath,
      grantedScopeCount: token.scopes.length,
      secretValuesLogged: false,
    });
    const channel = await fetchAuthorizedYouTubeChannel({
      accessToken: token.accessToken,
    });
    logger.info("Authorized YouTube channel verified.", {
      channelId: channel.channelId,
      title: channel.title,
    });
  } finally {
    clearTimeout(timeout);
    server.close();
  }
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
