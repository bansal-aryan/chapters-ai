import { type NextRequest, NextResponse } from "next/server";
import { buildAssistantResponse } from "@/lib/ai/assistant";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { searchWorkspaceText } from "@/lib/supabase/search";
import { getAuthenticatedSupabase, isAuthResult } from "@/lib/supabase/session";
import { getWorkspaceSnapshotFromSupabase } from "@/lib/supabase/workspace";

type AssistantRequest = {
  assignmentId?: unknown;
  courseId?: unknown;
  message?: unknown;
  scope?: unknown;
  threadId?: unknown;
};

type ChatScope = "global" | "class" | "assignment";

function normalizeScope(value: unknown): ChatScope {
  if (value === "class" || value === "assignment" || value === "global") {
    return value;
  }

  return "global";
}

function normalizeOptionalId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(request, "assistant", {
    limit: 30,
    windowMs: 5 * 60 * 1000
  });

  if (!limit.ok) {
    return rateLimitResponse(limit);
  }

  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    return auth.error;
  }

  const { supabase, user } = auth;
  const body = (await request.json().catch(() => null)) as AssistantRequest | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  if (message.length > 4000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  }

  const scope = normalizeScope(body?.scope);
  const courseId = normalizeOptionalId(body?.courseId);
  const assignmentId = normalizeOptionalId(body?.assignmentId);
  const requestedThreadId = normalizeOptionalId(body?.threadId);
  const threadId = requestedThreadId
    ? await getOwnedThreadId(requestedThreadId)
    : await createThread({ assignmentId, courseId, message, scope, userId: user.id });

  if (!threadId) {
    return NextResponse.json({ error: "Could not open chat thread." }, { status: 400 });
  }

  const userMessageResult = await supabase.from("chat_messages").insert({
    user_id: user.id,
    thread_id: threadId,
    role: "user",
    content: message
  });

  if (userMessageResult.error) {
    return NextResponse.json({ error: userMessageResult.error.message }, { status: 400 });
  }

  const [snapshot, results] = await Promise.all([
    getWorkspaceSnapshotFromSupabase({ allowEmpty: true }),
    searchWorkspaceText(supabase, message, { courseId, limit: 5 })
  ]);
  const assistantContent = buildAssistantResponse({ message, results, snapshot });
  const citationResourceIds = results
    .map((result) => result.fileResourceId)
    .filter((id): id is string => Boolean(id));

  const { data: assistantMessage, error: assistantError } = await supabase
    .from("chat_messages")
    .insert({
      user_id: user.id,
      thread_id: threadId,
      role: "assistant",
      content: assistantContent,
      citation_resource_ids: citationResourceIds,
      metadata: {
        policy: "guide_do_not_complete",
        search_result_ids: results.map((result) => result.id)
      }
    })
    .select("*")
    .single();

  if (assistantError) {
    return NextResponse.json({ error: assistantError.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      citations: results,
      message: assistantMessage,
      threadId
    },
    { headers: limit.headers }
  );

  async function createThread({
    assignmentId,
    courseId,
    message,
    scope,
    userId
  }: {
    assignmentId: string | null;
    courseId: string | null;
    message: string;
    scope: ChatScope;
    userId: string;
  }) {
    const { data, error } = await supabase
      .from("chat_threads")
      .insert({
        user_id: userId,
        scope,
        course_id: courseId,
        assignment_id: assignmentId,
        title: message.slice(0, 72)
      })
      .select("id")
      .single();

    if (error) {
      return null;
    }

    return data.id;
  }

  async function getOwnedThreadId(threadId: string) {
    const { data, error } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("id", threadId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.id;
  }
}
