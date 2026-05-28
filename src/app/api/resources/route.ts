import { type NextRequest, NextResponse } from "next/server";
import type { Json } from "@/lib/supabase/database.types";
import { getAuthenticatedSupabase, isAuthResult } from "@/lib/supabase/session";

type ResourceDbType = "pdf" | "doc" | "image" | "link";

const resourceTypes = new Set<ResourceDbType>(["pdf", "doc", "image", "link"]);

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    return auth.error;
  }

  const body = (await request.json().catch(() => null)) as {
    courseId?: unknown;
    title?: unknown;
    type?: unknown;
    url?: unknown;
  } | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const courseId = typeof body?.courseId === "string" ? body.courseId.trim() : "";
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const type = getResourceType(body?.type);

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (!courseId) {
    return NextResponse.json({ error: "Course is required." }, { status: 400 });
  }

  if (!isHttpUrl(url)) {
    return NextResponse.json({ error: "Use a valid http or https URL." }, { status: 400 });
  }

  const { data: course, error: courseError } = await auth.supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (courseError) {
    return NextResponse.json({ error: courseError.message }, { status: 400 });
  }

  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const metadata: Json = {
    added_by: "user",
    source: "manual",
    url
  };
  const { data, error } = await auth.supabase
    .from("file_resources")
    .insert({
      user_id: auth.user.id,
      course_id: courseId,
      source: "manual",
      canvas_file_id: null,
      title,
      type,
      summary: `Manually added resource link for ${title}.`,
      citation: url,
      storage_path: null,
      metadata
    })
    .select("id, course_id, source, title, type, citation")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    resource: {
      ...data,
      href: data.citation
    }
  });
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function getResourceType(value: unknown): ResourceDbType {
  return typeof value === "string" && resourceTypes.has(value as ResourceDbType)
    ? (value as ResourceDbType)
    : "link";
}
