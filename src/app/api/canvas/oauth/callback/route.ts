import { type NextRequest, NextResponse } from "next/server";
import type { Json } from "@/lib/supabase/database.types";
import {
  CANVAS_OAUTH_STATE_COOKIE,
  decodeOAuthStateCookie,
  encryptCanvasTokenPayload,
  exchangeCanvasCode,
  getCanvasOAuthConfig,
  oauthStateCookieOptions,
  statesMatch
} from "@/lib/canvas/oauth";
import {
  type AuthenticatedSupabase,
  getAuthenticatedSupabase,
  isAuthResult
} from "@/lib/supabase/session";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const responseUrl = new URL("/settings", request.url);
  const stateCookie = decodeOAuthStateCookie(request.cookies.get(CANVAS_OAUTH_STATE_COOKIE)?.value);
  const returnedState = request.nextUrl.searchParams.get("state") ?? "";

  if (!stateCookie || !returnedState || !statesMatch(stateCookie.state, returnedState) || stateCookie.userId !== auth.user.id) {
    responseUrl.searchParams.set("canvas", "invalid_state");
    return redirectAndClearState(request, responseUrl);
  }

  const canvasError = request.nextUrl.searchParams.get("error");
  if (canvasError) {
    await markConnectionError({
      auth,
      connectionId: stateCookie.connectionId,
      metadata: {
        oauth_error: canvasError,
        oauth_error_description: request.nextUrl.searchParams.get("error_description") ?? undefined
      }
    });
    responseUrl.searchParams.set("canvas", "oauth_denied");
    return redirectAndClearState(request, responseUrl);
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    await markConnectionError({
      auth,
      connectionId: stateCookie.connectionId,
      metadata: {
        oauth_error: "missing_code"
      }
    });
    responseUrl.searchParams.set("canvas", "missing_code");
    return redirectAndClearState(request, responseUrl);
  }

  const config = getCanvasOAuthConfig(request.nextUrl.origin);

  if (!config.ok) {
    responseUrl.searchParams.set("canvas", "missing_config");
    responseUrl.searchParams.set("missing", config.missing.join(","));
    return redirectAndClearState(request, responseUrl);
  }

  const tokenResult = await exchangeCanvasCode({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    code,
    domain: stateCookie.domain,
    redirectUri: stateCookie.redirectUri
  });

  if (!tokenResult.ok) {
    await markConnectionError({
      auth,
      connectionId: stateCookie.connectionId,
      metadata: {
        oauth_error: "token_exchange_failed",
        oauth_status: tokenResult.status,
        oauth_summary: tokenResult.error
      }
    });
    responseUrl.searchParams.set("canvas", "token_exchange_failed");
    return redirectAndClearState(request, responseUrl);
  }

  const tokenReference = encryptCanvasTokenPayload(tokenResult.payload);
  const connectedAt = new Date().toISOString();
  const { error: updateError } = await auth.supabase
    .from("canvas_connections")
    .update({
      canvas_user_id: tokenResult.payload.user?.id ?? null,
      metadata: withoutUndefined({
        canvas_region: tokenResult.payload.canvasRegion,
        oauth_completed_at: connectedAt,
        token_expires_at: tokenResult.payload.expiresAt,
        token_type: tokenResult.payload.tokenType,
        user_name: tokenResult.payload.user?.name
      }),
      status: "connected",
      token_reference: tokenReference
    })
    .eq("id", stateCookie.connectionId)
    .eq("user_id", auth.user.id);

  if (updateError) {
    responseUrl.searchParams.set("canvas", "connection_error");
    return redirectAndClearState(request, responseUrl);
  }

  await auth.supabase.from("sync_runs").insert({
    user_id: auth.user.id,
    provider: "canvas",
    status: "queued",
    summary: "Canvas OAuth connected. Initial sync is queued.",
    metadata: {
      canvas_connection_id: stateCookie.connectionId,
      canvas_domain: stateCookie.domain,
      queued_from: "oauth_callback"
    }
  });

  responseUrl.searchParams.set("canvas", "connected");
  return redirectAndClearState(request, responseUrl);
}

function redirectAndClearState(request: NextRequest, url: URL) {
  const response = NextResponse.redirect(url);
  response.cookies.set(CANVAS_OAUTH_STATE_COOKIE, "", {
    ...oauthStateCookieOptions(request.nextUrl.protocol === "https:"),
    maxAge: 0
  });
  return response;
}

async function markConnectionError({
  auth,
  connectionId,
  metadata
}: {
  auth: AuthenticatedSupabase;
  connectionId: string;
  metadata: Record<string, Json | undefined>;
}) {
  await auth.supabase
    .from("canvas_connections")
    .update({
      metadata: {
        ...withoutUndefined(metadata),
        oauth_failed_at: new Date().toISOString()
      },
      status: "error"
    })
    .eq("id", connectionId)
    .eq("user_id", auth.user.id);
}

function withoutUndefined(metadata: Record<string, Json | undefined>) {
  return Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, Json] => entry[1] !== undefined)
  );
}
