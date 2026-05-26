import { type NextRequest, NextResponse } from "next/server";
import { normalizeCanvasDomain } from "@/lib/canvas/client";
import { connectCanvasPersonalAccessToken } from "@/lib/canvas/personal-token";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { getAuthenticatedSupabase, isAuthResult } from "@/lib/supabase/session";

type TokenConnectionRequest = {
  accessToken?: unknown;
  domain?: unknown;
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

  const body = (await request.json().catch(() => null)) as TokenConnectionRequest | null;
  const domain = normalizeCanvasDomain(String(body?.domain ?? ""));
  const accessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";
  const result = await connectCanvasPersonalAccessToken(auth.supabase, {
    accessToken,
    domain,
    queueSource: "personal_access_token",
    userId: auth.user.id
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { headers: limit.headers, status: result.status });
  }

  return NextResponse.json({ connection: result.connection }, { headers: limit.headers });
}
