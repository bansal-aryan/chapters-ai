import { NextResponse } from "next/server";
import { getWorkspaceSnapshotFromSupabase } from "@/lib/supabase/workspace";
import { getAuthenticatedSupabase, isAuthResult } from "@/lib/supabase/session";

export async function GET() {
  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    return auth.error;
  }

  const snapshot = await getWorkspaceSnapshotFromSupabase({ allowEmpty: true });

  return NextResponse.json({ workspace: snapshot });
}
