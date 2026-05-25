import { type NextRequest, NextResponse } from "next/server";
import { normalizeCanvasDomain } from "@/lib/canvas/client";
import type { Json } from "@/lib/supabase/database.types";
import {
  encryptCanvasTokenPayload,
  hasCanvasTokenEncryptionKey
} from "@/lib/canvas/oauth";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { getAuthenticatedSupabase, isAuthResult } from "@/lib/supabase/session";

const appScopes = ["courses", "assignments", "files", "modules"] as const;
const safeConnectionColumns =
  "id, canvas_domain, canvas_user_id, status, scopes, last_synced_at, metadata, created_at, updated_at";

type TokenConnectionRequest = {
  accessToken?: unknown;
  domain?: unknown;
};

type CanvasSelfProfile = {
  avatar_url?: unknown;
  email?: unknown;
  id?: unknown;
  login_id?: unknown;
  name?: unknown;
  primary_email?: unknown;
  sortable_name?: unknown;
};

type TokenValidationResult =
  | {
      ok: true;
      user: {
        email?: string;
        id: string;
        loginId?: string;
        name?: string;
      };
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(request, "canvas-token", {
    limit: 8,
    windowMs: 15 * 60 * 1000
  });

  if (!limit.ok) {
    return rateLimitResponse(limit);
  }

  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    if (request.cookies.get("chapters_demo_session")?.value === "1") {
      return NextResponse.json(
        { error: "Sign in with a real account before connecting Canvas. Demo mode cannot save school access tokens." },
        { status: 401 }
      );
    }

    return auth.error;
  }

  if (!hasCanvasTokenEncryptionKey()) {
    return NextResponse.json(
      { error: "CANVAS_TOKEN_ENCRYPTION_KEY is required before saving Canvas tokens." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as TokenConnectionRequest | null;
  const domain = normalizeCanvasDomain(String(body?.domain ?? ""));
  const accessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";

  if (!domain) {
    return NextResponse.json({ error: "Canvas domain is required." }, { status: 400 });
  }

  if (!accessToken) {
    return NextResponse.json({ error: "Canvas access token is required." }, { status: 400 });
  }

  const validation = await validateCanvasAccessToken({ accessToken, domain });

  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status === 401 || validation.status === 403 ? 401 : 400 }
    );
  }

  const connectedAt = new Date().toISOString();
  const tokenReference = encryptCanvasTokenPayload({
    accessToken,
    issuedAt: connectedAt,
    tokenType: "Bearer",
    user: {
      id: validation.user.id,
      name: validation.user.name
    }
  });

  const { data: connection, error } = await auth.supabase
    .from("canvas_connections")
    .upsert(
      {
        user_id: auth.user.id,
        canvas_domain: domain,
        canvas_user_id: validation.user.id,
        status: "connected",
        token_reference: tokenReference,
        scopes: [...appScopes],
        metadata: withoutUndefined({
          auth_method: "personal_access_token",
          connected_at: connectedAt,
          login_id: validation.user.loginId,
          primary_email: validation.user.email,
          user_name: validation.user.name
        })
      },
      {
        onConflict: "user_id,canvas_domain"
      }
    )
    .select(safeConnectionColumns)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await auth.supabase.from("sync_runs").insert({
    user_id: auth.user.id,
    provider: "canvas",
    status: "queued",
    summary: "Canvas access token connected. Initial sync is queued.",
    metadata: {
      canvas_connection_id: connection.id,
      canvas_domain: domain,
      queued_from: "personal_access_token"
    }
  });

  return NextResponse.json({ connection }, { headers: limit.headers });
}

async function validateCanvasAccessToken({
  accessToken,
  domain
}: {
  accessToken: string;
  domain: string;
}): Promise<TokenValidationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const profileResult = await requestCanvasSelf({ accessToken, domain, path: "/api/v1/users/self/profile", signal: controller.signal });
    let profile: CanvasSelfProfile;

    if (profileResult.ok) {
      profile = profileResult.profile;
    } else {
      const fallbackResult = await requestCanvasSelf({ accessToken, domain, path: "/api/v1/users/self", signal: controller.signal });

      if (!fallbackResult.ok) {
        return {
          ok: false,
          error: getCanvasValidationError({ domain, status: fallbackResult.status }),
          status: fallbackResult.status
        };
      }

      profile = fallbackResult.profile;
    }

    const id = profile?.id;

    if (typeof id !== "string" && typeof id !== "number") {
      return {
        ok: false,
        error: "Canvas did not return a user profile for that token.",
        status: 400
      };
    }

    return {
      ok: true,
      user: {
        email:
          typeof profile?.primary_email === "string"
            ? profile.primary_email
            : typeof profile?.email === "string"
              ? profile.email
              : undefined,
        id: String(id),
        loginId: typeof profile?.login_id === "string" ? profile.login_id : undefined,
        name:
          typeof profile?.name === "string"
            ? profile.name
            : typeof profile?.sortable_name === "string"
              ? profile.sortable_name
              : undefined
      }
    };
  } catch {
    return {
      ok: false,
      error: "Could not reach Canvas to validate that access token.",
      status: 400
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function requestCanvasSelf({
  accessToken,
  domain,
  path,
  signal
}: {
  accessToken: string;
  domain: string;
  path: "/api/v1/users/self" | "/api/v1/users/self/profile";
  signal: AbortSignal;
}): Promise<
  | {
      ok: true;
      profile: CanvasSelfProfile;
    }
  | {
      ok: false;
      status: number;
    }
> {
  const response = await fetch(`https://${domain}${path}`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`
    },
    signal
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status
    };
  }

  return {
    ok: true,
    profile: (await response.json().catch(() => ({}))) as CanvasSelfProfile
  };
}

function getCanvasValidationError({ domain, status }: { domain: string; status: number }) {
  if (status === 401 || status === 403) {
    return "Canvas rejected that access token. Create a fresh token and paste the full value.";
  }

  if (status === 404) {
    return `Canvas did not find the API on ${domain}. Use your school's Canvas host, like school.instructure.com, not a course page or login URL.`;
  }

  return `Canvas token validation failed with HTTP ${status}. Check the Canvas domain and token permissions, then try again.`;
}

function withoutUndefined(metadata: Record<string, Json | undefined>) {
  return Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, Json] => entry[1] !== undefined)
  );
}
