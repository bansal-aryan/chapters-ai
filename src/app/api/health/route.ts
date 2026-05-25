import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function GET() {
  const supabase = getSupabaseEnv();

  return NextResponse.json({
    ok: true,
    services: {
      canvasEncryption: Boolean(process.env.CANVAS_TOKEN_ENCRYPTION_KEY),
      canvasOAuth: Boolean(process.env.CANVAS_CLIENT_ID && process.env.CANVAS_CLIENT_SECRET),
      canvasSyncJob: Boolean((process.env.CRON_SECRET ?? process.env.CANVAS_SYNC_SECRET) && process.env.SUPABASE_SERVICE_ROLE_KEY),
      supabase: Boolean(supabase)
    }
  });
}
