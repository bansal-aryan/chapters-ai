import { type NextRequest, NextResponse } from "next/server";
import { normalizeCanvasDomain } from "@/lib/canvas/client";
import {
  CANVAS_OAUTH_STATE_COOKIE,
  createCanvasAuthorizeUrl,
  createOAuthState,
  encodeOAuthStateCookie,
  getCanvasOAuthConfig,
  oauthStateCookieOptions
} from "@/lib/canvas/oauth";
import { getAuthenticatedSupabase, isAuthResult } from "@/lib/supabase/session";

const appScopes = ["courses", "assignments", "files", "modules"] as const;

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedSupabase();
  const settingsUrl = new URL("/settings", request.url);

  if (!isAuthResult(auth)) {
    if (request.cookies.get("chapters_demo_session")?.value === "1") {
      const signOutUrl = new URL("/auth/sign-out", request.url);
      signOutUrl.searchParams.set("next", "/login?next=%2Fsettings");
      return NextResponse.redirect(signOutUrl);
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", "/settings");
    return NextResponse.redirect(loginUrl);
  }

  const domain = normalizeCanvasDomain(request.nextUrl.searchParams.get("domain") ?? "");

  if (!domain) {
    settingsUrl.searchParams.set("canvas", "invalid_domain");
    return NextResponse.redirect(settingsUrl);
  }

  const config = getCanvasOAuthConfig(request.nextUrl.origin);

  if (!config.ok) {
    settingsUrl.searchParams.set("canvas", "missing_config");
    settingsUrl.searchParams.set("missing", config.missing.join(","));
    return NextResponse.redirect(settingsUrl);
  }

  const { data: connection, error } = await auth.supabase
    .from("canvas_connections")
    .upsert(
      {
        user_id: auth.user.id,
        canvas_domain: domain,
        status: "pending",
        scopes: [...appScopes],
        metadata: {
          oauth_started_at: new Date().toISOString(),
          redirect_uri: config.redirectUri,
          source: "oauth"
        }
      },
      {
        onConflict: "user_id,canvas_domain"
      }
    )
    .select("id, canvas_domain")
    .single();

  if (error) {
    settingsUrl.searchParams.set("canvas", "connection_error");
    return NextResponse.redirect(settingsUrl);
  }

  const state = createOAuthState();
  const authorizeUrl = createCanvasAuthorizeUrl({
    clientId: config.clientId,
    domain,
    redirectUri: config.redirectUri,
    scopes: config.scopes,
    state
  });
  const response = NextResponse.redirect(authorizeUrl);

  response.cookies.set(
    CANVAS_OAUTH_STATE_COOKIE,
    encodeOAuthStateCookie({
      connectionId: connection.id,
      domain: connection.canvas_domain,
      issuedAt: new Date().toISOString(),
      redirectUri: config.redirectUri,
      returnTo: "/settings",
      state,
      userId: auth.user.id
    }),
    oauthStateCookieOptions(request.nextUrl.protocol === "https:")
  );

  return response;
}
