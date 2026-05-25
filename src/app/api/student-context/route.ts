import { type NextRequest, NextResponse } from "next/server";
import type { Json } from "@/lib/supabase/database.types";
import { getAuthenticatedSupabase, isAuthResult } from "@/lib/supabase/session";

type StudentContextRequest = {
  aiNotes?: unknown;
  constraints?: unknown;
  goals?: unknown;
  learningPreferences?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asJsonRecord(value: unknown): Json {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return JSON.parse(JSON.stringify(value)) as Json;
  }

  return {};
}

export async function GET() {
  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("student_contexts")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ studentContext: data });
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    return auth.error;
  }

  const body = (await request.json().catch(() => null)) as StudentContextRequest | null;

  const { data, error } = await auth.supabase
    .from("student_contexts")
    .upsert({
      user_id: auth.user.id,
      goals: asString(body?.goals),
      constraints: asString(body?.constraints),
      ai_notes: asString(body?.aiNotes),
      learning_preferences: asJsonRecord(body?.learningPreferences)
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ studentContext: data });
}
