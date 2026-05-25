import { type NextRequest, NextResponse } from "next/server";
import { normalizeCanvasDomain } from "@/lib/canvas/client";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { getAuthenticatedSupabase, isAuthResult } from "@/lib/supabase/session";

const safeConnectionColumns =
  "id, canvas_domain, canvas_user_id, status, scopes, last_synced_at, metadata, created_at, updated_at";

export async function GET() {
  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("canvas_connections")
    .select(safeConnectionColumns)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ connections: data });
}

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(request, "canvas-connection", {
    limit: 12,
    windowMs: 15 * 60 * 1000
  });

  if (!limit.ok) {
    return rateLimitResponse(limit);
  }

  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    return auth.error;
  }

  const body = (await request.json().catch(() => null)) as { domain?: unknown } | null;
  const domain = normalizeCanvasDomain(String(body?.domain ?? ""));

  if (!domain) {
    return NextResponse.json({ error: "Canvas domain is required." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("canvas_connections")
    .upsert(
      {
        user_id: auth.user.id,
        canvas_domain: domain,
        status: "pending",
        scopes: ["courses", "assignments", "files", "modules"],
        metadata: {
          source: "api"
        }
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

  return NextResponse.json({ connection: data }, { headers: limit.headers });
}
