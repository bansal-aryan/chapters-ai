import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const CANVAS_OAUTH_STATE_COOKIE = "chapters_canvas_oauth_state";

const TOKEN_REFERENCE_PREFIX = "canvas-token:v1";
const OAUTH_STATE_TTL_SECONDS = 10 * 60;

export type CanvasOAuthConfig =
  | {
      ok: true;
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      scopes: string[];
    }
  | {
      ok: false;
      missing: string[];
    };

export type CanvasOAuthState = {
  connectionId: string;
  domain: string;
  issuedAt: string;
  redirectUri: string;
  returnTo: string;
  state: string;
  userId: string;
};

export type CanvasTokenPayload = {
  accessToken: string;
  canvasRegion?: string;
  expiresAt?: string;
  issuedAt: string;
  refreshToken?: string;
  tokenType: string;
  user?: {
    id: string;
    name?: string;
  };
};

export type CanvasTokenExchangeResult =
  | {
      ok: true;
      payload: CanvasTokenPayload;
      raw: CanvasOAuthTokenResponse;
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

type CanvasOAuthTokenResponse = {
  access_token?: unknown;
  canvas_region?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
  token_type?: unknown;
  user?: unknown;
};

type CanvasOAuthUser = {
  id?: unknown;
  name?: unknown;
};

export function getCanvasOAuthConfig(origin: string): CanvasOAuthConfig {
  const clientId = process.env.CANVAS_CLIENT_ID;
  const clientSecret = process.env.CANVAS_CLIENT_SECRET;
  const tokenKey = process.env.CANVAS_TOKEN_ENCRYPTION_KEY;

  if (!clientId || !clientSecret || !tokenKey) {
    return {
      ok: false,
      missing: [
        !clientId ? "CANVAS_CLIENT_ID" : null,
        !clientSecret ? "CANVAS_CLIENT_SECRET" : null,
        !tokenKey ? "CANVAS_TOKEN_ENCRYPTION_KEY" : null
      ].filter(Boolean) as string[]
    };
  }

  return {
    ok: true,
    clientId,
    clientSecret,
    redirectUri: process.env.CANVAS_OAUTH_REDIRECT_URI ?? `${origin}/api/canvas/oauth/callback`,
    scopes: parseScopes(process.env.CANVAS_OAUTH_SCOPES)
  };
}

export function hasCanvasTokenEncryptionKey() {
  return Boolean(process.env.CANVAS_TOKEN_ENCRYPTION_KEY);
}

export function createCanvasAuthorizeUrl({
  clientId,
  domain,
  redirectUri,
  scopes,
  state
}: {
  clientId: string;
  domain: string;
  redirectUri: string;
  scopes: string[];
  state: string;
}) {
  const url = new URL(`https://${domain}/login/oauth2/auth`);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("purpose", "chapters.ai");

  if (scopes.length) {
    url.searchParams.set("scope", scopes.join(" "));
  }

  return url;
}

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function encodeOAuthStateCookie(state: CanvasOAuthState) {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

export function decodeOAuthStateCookie(value: string | undefined): CanvasOAuthState | null {
  if (!value) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<CanvasOAuthState>;

    if (
      typeof decoded.connectionId !== "string" ||
      typeof decoded.domain !== "string" ||
      typeof decoded.issuedAt !== "string" ||
      typeof decoded.redirectUri !== "string" ||
      typeof decoded.returnTo !== "string" ||
      typeof decoded.state !== "string" ||
      typeof decoded.userId !== "string"
    ) {
      return null;
    }

    const issuedAt = new Date(decoded.issuedAt).getTime();
    if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > OAUTH_STATE_TTL_SECONDS * 1000) {
      return null;
    }

    return {
      connectionId: decoded.connectionId,
      domain: decoded.domain,
      issuedAt: decoded.issuedAt,
      redirectUri: decoded.redirectUri,
      returnTo: decoded.returnTo,
      state: decoded.state,
      userId: decoded.userId
    };
  } catch {
    return null;
  }
}

export function statesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function oauthStateCookieOptions(isSecure: boolean) {
  return {
    httpOnly: true,
    maxAge: OAUTH_STATE_TTL_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: isSecure
  };
}

export async function exchangeCanvasCode({
  clientId,
  clientSecret,
  code,
  domain,
  redirectUri
}: {
  clientId: string;
  clientSecret: string;
  code: string;
  domain: string;
  redirectUri: string;
}): Promise<CanvasTokenExchangeResult> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri
  });

  const response = await fetch(`https://${domain}/login/oauth2/token`, {
    body,
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded"
    },
    method: "POST"
  });

  const text = await response.text();
  const data = parseTokenResponse(text);

  if (!response.ok || !data) {
    return {
      ok: false,
      error: data ? "Canvas rejected the OAuth code exchange." : text.slice(0, 240),
      status: response.status
    };
  }

  const payload = toTokenPayload(data);

  if (!payload) {
    return {
      ok: false,
      error: "Canvas returned an OAuth response without an access token.",
      status: response.status
    };
  }

  return { ok: true, payload, raw: data };
}

export function encryptCanvasTokenPayload(payload: CanvasTokenPayload) {
  const key = getTokenEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return `${TOKEN_REFERENCE_PREFIX}:${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptCanvasTokenPayload(tokenReference: string): CanvasTokenPayload {
  const key = getTokenEncryptionKey();
  const [prefix, version, encoded] = tokenReference.split(":");

  if (`${prefix}:${version}` !== TOKEN_REFERENCE_PREFIX || !encoded) {
    throw new Error("Unsupported Canvas token reference format.");
  }

  const [ivValue, tagValue, ciphertextValue] = encoded.split(".");
  if (!ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Invalid Canvas token reference.");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final()
  ]).toString("utf8");

  return JSON.parse(plaintext) as CanvasTokenPayload;
}

function getTokenEncryptionKey() {
  const value = process.env.CANVAS_TOKEN_ENCRYPTION_KEY;

  if (!value) {
    throw new Error("Missing CANVAS_TOKEN_ENCRYPTION_KEY.");
  }

  const base64Key = Buffer.from(value, "base64");
  if (base64Key.length === 32) {
    return base64Key;
  }

  return createHash("sha256").update(value).digest();
}

function parseScopes(value: string | undefined) {
  return value
    ? value
        .split(/[,\s]+/)
        .map((scope) => scope.trim())
        .filter(Boolean)
    : [];
}

function parseTokenResponse(text: string): CanvasOAuthTokenResponse | null {
  try {
    const parsed = JSON.parse(text) as CanvasOAuthTokenResponse;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function toTokenPayload(response: CanvasOAuthTokenResponse): CanvasTokenPayload | null {
  if (typeof response.access_token !== "string") {
    return null;
  }

  const user = parseUser(response.user);
  const expiresIn = typeof response.expires_in === "number" ? response.expires_in : null;

  return {
    accessToken: response.access_token,
    canvasRegion: typeof response.canvas_region === "string" ? response.canvas_region : undefined,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined,
    issuedAt: new Date().toISOString(),
    refreshToken: typeof response.refresh_token === "string" ? response.refresh_token : undefined,
    tokenType: typeof response.token_type === "string" ? response.token_type : "Bearer",
    user
  };
}

function parseUser(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const user = value as CanvasOAuthUser;
  if (typeof user.id !== "string" && typeof user.id !== "number") {
    return undefined;
  }

  return {
    id: String(user.id),
    name: typeof user.name === "string" ? user.name : undefined
  };
}
