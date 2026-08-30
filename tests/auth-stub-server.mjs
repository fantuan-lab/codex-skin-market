/**
 * Minimal local-only GoTrue-compatible server for browser E2E tests.
 *
 * It intentionally knows about one account only and never contacts Google (or
 * any other network service). Run with: `node tests/auth-stub-server.mjs`.
 */
import { createHash, generateKeyPairSync, randomUUID, sign, verify } from "node:crypto";
import { createServer } from "node:http";

const host = process.env.AUTH_STUB_HOST || "127.0.0.1";
const port = Number.parseInt(process.env.AUTH_STUB_PORT || "43173", 10);
const account = {
  id: "8bf3896d-25df-418a-8436-4a588b59bd8c",
  email: "reviewer@example.com",
  password: "Correct-Horse-42!",
};
const keyId = "cleartag-e2e-rs256";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = publicKey.export({ format: "jwk" });
const refreshTokens = new Map();
const authorizationCodes = new Map();
const oauthRequests = [];

const base64url = (value) => Buffer.from(value).toString("base64url");
const now = () => Math.floor(Date.now() / 1000);

function testBaseUrl(request) {
  return `http://${request.headers.host || `${host}:${port}`}`;
}

function authUser(provider = "email") {
  const timestamp = new Date().toISOString();
  return {
    id: account.id,
    aud: "authenticated",
    role: "authenticated",
    email: account.email,
    email_confirmed_at: timestamp,
    phone: "",
    confirmed_at: timestamp,
    last_sign_in_at: timestamp,
    app_metadata: { provider, providers: [provider] },
    user_metadata: { name: "ClearTag Reviewer" },
    identities: [
      {
        identity_id: account.id,
        id: account.id,
        user_id: account.id,
        identity_data: { email: account.email, sub: account.id },
        provider,
        last_sign_in_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
      },
    ],
    created_at: timestamp,
    updated_at: timestamp,
    is_anonymous: false,
  };
}

function issueAccessToken(issuer, provider) {
  const issuedAt = now();
  const header = { alg: "RS256", typ: "JWT", kid: keyId };
  const payload = {
    iss: issuer,
    sub: account.id,
    aud: "authenticated",
    exp: issuedAt + 60 * 60,
    iat: issuedAt,
    nbf: issuedAt,
    jti: randomUUID(),
    email: account.email,
    phone: "",
    role: "authenticated",
    aal: "aal1",
    amr: [{ method: provider, timestamp: issuedAt }],
    app_metadata: { provider, providers: [provider] },
    user_metadata: { name: "ClearTag Reviewer" },
  };
  const input = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  return `${input}.${sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url")}`;
}

function issueSession(request, provider = "email") {
  const refreshToken = randomUUID();
  refreshTokens.set(refreshToken, { provider, issuedAt: now() });
  const expiresAt = now() + 60 * 60;
  return {
    access_token: issueAccessToken(`${testBaseUrl(request)}/auth/v1`, provider),
    token_type: "bearer",
    expires_in: 60 * 60,
    expires_at: expiresAt,
    refresh_token: refreshToken,
    user: authUser(provider),
  };
}

function send(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    "cache-control": "no-store",
    ...extraHeaders,
    "content-type": "application/json; charset=utf-8",
  });
  response.end(body === undefined ? "" : JSON.stringify(body));
}

function corsHeaders(request) {
  return {
    "access-control-allow-origin": request.headers.origin || "*",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

function badCredentials(response, request) {
  // Keep this intentionally generic, matching GoTrue's account-enumeration-safe response.
  send(response, 400, { code: "invalid_credentials", message: "Invalid login credentials" }, corsHeaders(request));
}

async function readBody(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function bearerToken(request) {
  const value = request.headers.authorization || "";
  return value.startsWith("Bearer ") ? value.slice("Bearer ".length) : null;
}

function verifyAccessToken(token) {
  if (!token) return false;
  const [encodedHeader, encodedPayload, encodedSignature, ...rest] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature || rest.length) return false;
  try {
    const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString());
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString());
    if (header.alg !== "RS256" || header.kid !== keyId || payload.sub !== account.id || payload.exp <= now()) return false;
    return verify(
      "RSA-SHA256",
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      publicKey,
      Buffer.from(encodedSignature, "base64url"),
    );
  } catch {
    return false;
  }
}

function isLocalCallback(url) {
  return url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "::1";
}

function pkceMatches(entry, verifier) {
  if (!entry.codeChallenge) return true;
  if (!verifier) return false;
  const method = (entry.codeChallengeMethod || "plain").toUpperCase();
  if (method === "S256") {
    return createHash("sha256").update(verifier).digest("base64url") === entry.codeChallenge;
  }
  return method === "PLAIN" && verifier === entry.codeChallenge;
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", testBaseUrl(request));
  const { pathname, searchParams } = requestUrl;
  const cors = corsHeaders(request);

  if (request.method === "OPTIONS") {
    response.writeHead(204, cors);
    response.end();
    return;
  }

  if (request.method === "GET" && pathname === "/__test/health") {
    send(response, 200, { ok: true }, cors);
    return;
  }

  if (request.method === "GET" && pathname === "/__test/state") {
    send(response, 200, {
      account: { id: account.id, email: account.email },
      refreshTokenCount: refreshTokens.size,
      authorizationCodeCount: authorizationCodes.size,
      oauthRequests,
    }, cors);
    return;
  }

  if (request.method === "POST" && pathname === "/__test/reset") {
    refreshTokens.clear();
    authorizationCodes.clear();
    oauthRequests.splice(0);
    send(response, 200, { ok: true }, cors);
    return;
  }

  if (request.method === "GET" && pathname === "/__test/oauth-callback") {
    send(response, 200, Object.fromEntries(searchParams), cors);
    return;
  }

  if (
    request.method === "GET" &&
    (pathname === "/auth/v1/.well-known/jwks.json" || pathname === "/.well-known/jwks.json")
  ) {
    send(response, 200, { keys: [{ ...publicJwk, kid: keyId, use: "sig", alg: "RS256" }] }, cors);
    return;
  }

  if (request.method === "POST" && pathname === "/auth/v1/token") {
    const grantType = searchParams.get("grant_type");
    const body = await readBody(request);
    if (grantType === "password") {
      if (body.email !== account.email || body.password !== account.password) {
        badCredentials(response, request);
        return;
      }
      send(response, 200, { ...issueSession(request), user: authUser("email") }, cors);
      return;
    }
    if (grantType === "refresh_token") {
      const entry = refreshTokens.get(body.refresh_token);
      if (!entry) {
        send(response, 400, { code: "refresh_token_not_found", message: "Invalid Refresh Token: Refresh Token Not Found" }, cors);
        return;
      }
      refreshTokens.delete(body.refresh_token);
      send(response, 200, issueSession(request, entry.provider), cors);
      return;
    }
    if (grantType === "pkce") {
      const code = body.auth_code || body.code;
      const entry = authorizationCodes.get(code);
      if (!entry || !pkceMatches(entry, body.code_verifier)) {
        send(response, 400, { code: "bad_code_verifier", message: "Invalid authorization code or code verifier" }, cors);
        return;
      }
      authorizationCodes.delete(code);
      send(response, 200, issueSession(request, "google"), cors);
      return;
    }
    send(response, 400, { code: "unsupported_grant_type", message: "Unsupported grant type" }, cors);
    return;
  }

  if (request.method === "GET" && pathname === "/auth/v1/user") {
    if (!verifyAccessToken(bearerToken(request))) {
      send(response, 401, { code: "bad_jwt", message: "Invalid JWT" }, cors);
      return;
    }
    send(response, 200, authUser(), cors);
    return;
  }

  if (request.method === "POST" && pathname === "/auth/v1/logout") {
    // GoTrue treats an already-invalidated client session as a harmless logout.
    send(response, 204, undefined, cors);
    return;
  }

  if (request.method === "GET" && pathname === "/auth/v1/authorize") {
    const provider = searchParams.get("provider");
    if (provider !== "google") {
      send(response, 400, { code: "validation_failed", message: "Only the google provider is available in this test stub" }, cors);
      return;
    }
    const suppliedRedirect = searchParams.get("redirect_to");
    const fallbackRedirect = `${testBaseUrl(request)}/__test/oauth-callback`;
    let callbackUrl;
    try {
      callbackUrl = suppliedRedirect ? new URL(suppliedRedirect) : new URL(fallbackRedirect);
    } catch {
      callbackUrl = new URL(fallbackRedirect);
    }
    if (!isLocalCallback(callbackUrl)) callbackUrl = new URL(fallbackRedirect);

    const code = randomUUID();
    const state = searchParams.get("state");
    authorizationCodes.set(code, {
      codeChallenge: searchParams.get("code_challenge"),
      codeChallengeMethod: searchParams.get("code_challenge_method"),
    });
    callbackUrl.searchParams.set("code", code);
    if (state) callbackUrl.searchParams.set("state", state);
    oauthRequests.push({
      provider,
      redirectTo: callbackUrl.toString(),
      code,
      codeChallengeMethod: searchParams.get("code_challenge_method"),
      createdAt: new Date().toISOString(),
    });
    response.writeHead(302, { ...cors, location: callbackUrl.toString(), "cache-control": "no-store" });
    response.end();
    return;
  }

  send(response, 404, { code: "not_found", message: "Test auth stub route not found" }, cors);
});

server.listen(port, host, () => {
  console.log(`ClearTag auth test stub listening on http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
