import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { syncDueCanvasConnections, syncQueuedCanvasRuns } from "@/lib/canvas/sync";
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

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 5), 1), 10);
  const staleMinutes = Math.min(Math.max(Number(request.nextUrl.searchParams.get("staleMinutes") ?? 2), 1), 60);
  const queuedResults = await syncQueuedCanvasRuns(supabase, limit);
  const dueResults = await syncDueCanvasConnections(supabase, { limit, staleMinutes });
  const results = [...queuedResults, ...dueResults];

  return NextResponse.json({
    processed: results.length,
    queued: queuedResults.length,
    stale: dueResults.length,
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
