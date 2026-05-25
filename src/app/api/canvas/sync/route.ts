import { type NextRequest, NextResponse } from "next/server";
import { normalizeCanvasDomain } from "@/lib/canvas/client";
import { syncCanvasForUser } from "@/lib/canvas/sync";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { getAuthenticatedSupabase, isAuthResult } from "@/lib/supabase/session";

export const runtime = "nodejs";

type SyncRequest = {
  connectionId?: unknown;
  domain?: unknown;
};

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(request, "canvas-sync", {
    limit: 5,
    windowMs: 15 * 60 * 1000
  });

  if (!limit.ok) {
    return rateLimitResponse(limit);
  }

  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    return auth.error;
  }

  const body = (await request.json().catch(() => null)) as SyncRequest | null;
  const domain = typeof body?.domain === "string" ? normalizeCanvasDomain(body.domain) : undefined;
  const connectionId = typeof body?.connectionId === "string" ? body.connectionId : undefined;
  const result = await syncCanvasForUser(auth.supabase, {
    connectionId,
    domain,
    userId: auth.user.id
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, syncRunId: result.syncRunId },
      { headers: limit.headers, status: result.status }
    );
  }

  return NextResponse.json({ sync: result }, { headers: limit.headers });
}
