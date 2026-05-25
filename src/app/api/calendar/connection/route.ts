import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase, isAuthResult } from "@/lib/supabase/session";

type CalendarConnectionRequest = {
  accountEmail?: unknown;
};

export async function GET() {
  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("calendar_connections")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ connections: data });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    return auth.error;
  }

  const body = (await request.json().catch(() => null)) as CalendarConnectionRequest | null;
  const accountEmail = typeof body?.accountEmail === "string" ? body.accountEmail.trim().toLowerCase() : "";

  const { data, error } = await auth.supabase
    .from("calendar_connections")
    .upsert(
      {
        user_id: auth.user.id,
        provider: "google",
        account_email: accountEmail || null,
        status: "pending",
        scopes: ["calendar.readonly", "calendar.events"],
        metadata: {
          source: "api"
        }
      },
      {
        onConflict: "user_id,provider,account_email"
      }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ connection: data });
}
