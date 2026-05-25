import { type NextRequest, NextResponse } from "next/server";
import { searchWorkspaceText } from "@/lib/supabase/search";
import { getAuthenticatedSupabase, isAuthResult } from "@/lib/supabase/session";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    return auth.error;
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const courseId = request.nextUrl.searchParams.get("courseId");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 10);
  const results = await searchWorkspaceText(auth.supabase, query, {
    courseId,
    limit: Number.isFinite(limit) ? limit : 10
  });

  return NextResponse.json({ results });
}
