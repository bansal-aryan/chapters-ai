import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function GET() {
  const supabase = getSupabaseEnv();

  return NextResponse.json({
    ok: true,
    services: {
      canvasEncryption: Boolean(process.env.CANVAS_TOKEN_ENCRYPTION_KEY),
      canvasPersonalTokens: Boolean(process.env.CANVAS_TOKEN_ENCRYPTION_KEY),
      canvasSyncJob: Boolean((process.env.CRON_SECRET ?? process.env.CANVAS_SYNC_SECRET) && process.env.SUPABASE_SERVICE_ROLE_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
      supabase: Boolean(supabase)
    }
  });
}
