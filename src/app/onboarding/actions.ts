"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { connectCanvasPersonalAccessToken } from "@/lib/canvas/personal-token";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type StudentLevel = "high_school" | "college" | "other";

function normalizeCanvasDomain(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().toLowerCase();

  if (!raw) {
    return "";
  }

  return raw
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/\/$/, "");
}

function getStudentLevel(value: FormDataEntryValue | null): StudentLevel {
  if (value === "high_school" || value === "college" || value === "other") {
    return value;
  }

  return "college";
}

export async function completeOnboarding(formData: FormData) {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    redirect("/onboarding?error=Supabase%20is%20not%20configured");
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/onboarding");
  }

  const fullName = String(formData.get("fullName") ?? "").trim() || (user.email ?? "Student");
  const schoolName = String(formData.get("schoolName") ?? "").trim();
  const studentLevel = getStudentLevel(formData.get("studentLevel"));
  const timezone = String(formData.get("timezone") ?? "").trim() || "America/Los_Angeles";
  const canvasDomain = normalizeCanvasDomain(formData.get("canvasDomain"));
  const canvasAccessToken = String(formData.get("canvasAccessToken") ?? "").trim();

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: fullName,
    school_name: schoolName || null,
    student_level: studentLevel,
    timezone
  });

  if (profileError) {
    redirect(`/onboarding?error=${encodeURIComponent(profileError.message)}`);
  }

  const { error: contextError } = await supabase.from("student_contexts").upsert({
    user_id: user.id,
    goals: "Stay ahead of assignments and protect study time.",
    learning_preferences: {
      student_level: studentLevel
    },
    constraints: "",
    ai_notes: ""
  });

  if (contextError) {
    redirect(`/onboarding?error=${encodeURIComponent(contextError.message)}`);
  }

  if (!canvasDomain || !canvasAccessToken) {
    redirect("/onboarding?error=Canvas%20domain%20and%20personal%20access%20token%20are%20required%20for%20this%20MVP");
  }

  const canvasResult = await connectCanvasPersonalAccessToken(supabase, {
    accessToken: canvasAccessToken,
    domain: canvasDomain,
    queueSource: "onboarding",
    userId: user.id
  });

  if (!canvasResult.ok) {
    redirect(`/onboarding?error=${encodeURIComponent(canvasResult.error)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
