"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

  if (canvasDomain) {
    const { error: canvasError } = await supabase.from("canvas_connections").upsert(
      {
        user_id: user.id,
        canvas_domain: canvasDomain,
        status: "pending",
        scopes: ["courses", "assignments", "files", "modules"],
        metadata: {
          source: "onboarding"
        }
      },
      {
        onConflict: "user_id,canvas_domain"
      }
    );

    if (canvasError) {
      redirect(`/onboarding?error=${encodeURIComponent(canvasError.message)}`);
    }

    const { error: syncError } = await supabase.from("sync_runs").insert({
      user_id: user.id,
      provider: "canvas",
      status: "queued",
      summary: `Initial Canvas sync queued for ${canvasDomain}`,
      metadata: {
        canvas_domain: canvasDomain,
        source: "onboarding"
      }
    });

    if (syncError) {
      redirect(`/onboarding?error=${encodeURIComponent(syncError.message)}`);
    }
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
