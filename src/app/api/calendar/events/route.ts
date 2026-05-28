import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase, isAuthResult } from "@/lib/supabase/session";

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    return auth.error;
  }

  const body = (await request.json().catch(() => null)) as {
    endsAt?: unknown;
    startsAt?: unknown;
    title?: unknown;
  } | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const startsAt = parseDate(body?.startsAt);
  const endsAt = parseDate(body?.endsAt);

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (!startsAt || !endsAt) {
    return NextResponse.json({ error: "Start and end time are required." }, { status: 400 });
  }

  if (endsAt.getTime() <= startsAt.getTime()) {
    return NextResponse.json({ error: "End time must be after the start time." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("manual_events")
    .insert({
      user_id: auth.user.id,
      title,
      cadence: "Manual",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString()
    })
    .select("id, title, cadence, starts_at, ends_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    event: {
      cadence: data.cadence,
      endsAt: data.ends_at,
      id: data.id,
      startsAt: data.starts_at,
      title: data.title
    }
  });
}

function parseDate(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
