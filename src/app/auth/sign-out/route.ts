import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getSafeNext(value: string | null, fallback = "/login") {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return fallback;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = getSafeNext(requestUrl.searchParams.get("next"));
  const supabase = await createServerSupabaseClient();
  await supabase?.auth.signOut();

  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.delete("chapters_demo_session");

  return response;
}
