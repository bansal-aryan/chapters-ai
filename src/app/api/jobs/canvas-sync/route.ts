import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { syncQueuedCanvasRuns } from "@/lib/canvas/sync";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleCanvasSyncJob(request);
}

export async function GET(request: NextRequest) {
  return handleCanvasSyncJob(request);
}

async function handleCanvasSyncJob(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? process.env.CANVAS_SYNC_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }

  if (!hasBearerToken(request, secret)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase service client is not configured." }, { status: 503 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 3);
  const results = await syncQueuedCanvasRuns(supabase, Math.min(Math.max(limit, 1), 10));

  return NextResponse.json({
    processed: results.length,
    results
  });
}

function hasBearerToken(request: NextRequest, secret: string) {
  const value = request.headers.get("authorization") ?? "";
  const token = value.startsWith("Bearer ") ? value.slice("Bearer ".length) : "";

  if (!token || token.length !== secret.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}
