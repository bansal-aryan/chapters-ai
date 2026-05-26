import { type NextRequest, NextResponse } from "next/server";
import { buildAssistantResponse } from "@/lib/ai/assistant";
import {
  type AssistantHistoryMessage,
  generateOpenAIAssistantResponse
} from "@/lib/ai/openai-assistant";
import { getDemoWorkspaceSnapshot } from "@/lib/domain/demo-store";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { searchDemoWorkspaceText, searchWorkspaceText } from "@/lib/supabase/search";
import { getAuthenticatedSupabase, isAuthResult } from "@/lib/supabase/session";
import { getWorkspaceSnapshotFromSupabase, type WorkspaceSnapshot } from "@/lib/supabase/workspace";
import type { SearchResult } from "@/types";

type AssistantRequest = {
  assignmentId?: unknown;
  courseId?: unknown;
  message?: unknown;
  recentMessages?: unknown;
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
  const clientRecentMessages = normalizeRecentMessages(body?.recentMessages);

  if (request.cookies.get("chapters_demo_session")?.value === "1") {
    const snapshot = getDemoWorkspaceSnapshot();
    const results = withScopedResults(snapshot, searchDemoWorkspaceText(message, { courseId, limit: 5 }), {
      assignmentId,
      courseId
    });
    const threadId = requestedThreadId ?? `demo-thread-${scope}-${assignmentId ?? courseId ?? "global"}`;
    const assistantContent = buildAssistantResponse({
      assignmentId,
      courseId,
      message,
      recentMessages: clientRecentMessages,
      results,
      snapshot
    });

    return NextResponse.json(
      {
        citations: results,
        message: {
          citation_resource_ids: results.map((result) => result.fileResourceId).filter(Boolean),
          content: assistantContent,
          id: `demo-message-${Date.now()}`,
          role: "assistant",
          thread_id: threadId
        },
        threadId
      },
      { headers: limit.headers }
    );
  }

  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    return auth.error;
  }

  const { supabase, user } = auth;
  const threadId = requestedThreadId
    ? await getOwnedThreadId(requestedThreadId)
    : await createThread({ assignmentId, courseId, message, scope, userId: user.id });

  if (!threadId) {
    return NextResponse.json({ error: "Could not open chat thread." }, { status: 400 });
  }

  const threadRecentMessages = requestedThreadId ? await getRecentThreadMessages(threadId) : [];
  const recentMessages = threadRecentMessages.length ? threadRecentMessages : clientRecentMessages;
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
  const scopedResults = withScopedResults(snapshot, results, { assignmentId, courseId });
  const openAIResult = await generateOpenAIAssistantResponse({
    assignmentId,
    courseId,
    message,
    recentMessages,
    results: scopedResults,
    snapshot
  });
  const assistantContent =
    openAIResult?.content ??
    buildAssistantResponse({ assignmentId, courseId, message, recentMessages, results: scopedResults, snapshot });
  const citationResourceIds = scopedResults
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
        model: openAIResult?.model,
        openai_response_id: openAIResult?.responseId,
        policy: "guide_do_not_complete",
        provider: openAIResult ? "openai" : "fallback",
        search_result_ids: scopedResults.map((result) => result.id)
      }
    })
    .select("*")
    .single();

  if (assistantError) {
    return NextResponse.json({ error: assistantError.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      citations: scopedResults,
      message: assistantMessage,
      provider: openAIResult ? "openai" : "fallback",
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

  async function getRecentThreadMessages(threadId: string): Promise<AssistantHistoryMessage[]> {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("thread_id", threadId)
      .eq("user_id", user.id)
      .in("role", ["assistant", "user"])
      .order("created_at", { ascending: false })
      .limit(8);

    if (error || !data?.length) {
      return [];
    }

    return data
      .reverse()
      .map((item) => ({
        content: item.content.slice(0, 1200),
        role: item.role === "assistant" ? "assistant" : "user"
      }));
  }
}

function normalizeRecentMessages(value: unknown): AssistantHistoryMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const candidate = item as { content?: unknown; role?: unknown };

      if ((candidate.role !== "assistant" && candidate.role !== "user") || typeof candidate.content !== "string") {
        return [];
      }

      const content = candidate.content.trim();
      const role: AssistantHistoryMessage["role"] = candidate.role;

      return content ? [{ content: content.slice(0, 1200), role }] : [];
    })
    .slice(-8);
}

function withScopedResults(
  snapshot: WorkspaceSnapshot | null,
  results: SearchResult[],
  {
    assignmentId,
    courseId
  }: {
    assignmentId: string | null;
    courseId: string | null;
  }
) {
  if (!snapshot) {
    return results;
  }

  const courseNameById = new Map(snapshot.courses.map((course) => [course.id, course.name]));
  const assignment = assignmentId ? snapshot.assignments.find((item) => item.id === assignmentId) : null;
  const scopedResults: SearchResult[] = [];

  if (assignment) {
    scopedResults.push({
      assignmentId: assignment.id,
      citation: courseNameById.get(assignment.courseId) ?? "Assignment",
      courseId: assignment.courseId,
      id: assignment.id,
      relevance: 1,
      sourceType: "assignment",
      summary: assignment.summary,
      title: assignment.title
    });

    assignment.relatedFileIds.forEach((fileId) => {
      const file = snapshot.files.find((item) => item.id === fileId);

      if (file) {
        scopedResults.push({
          citation: file.citation,
          courseId: file.courseId,
          fileResourceId: file.id,
          id: file.id,
          relevance: 1,
          sourceType: "file",
          summary: file.summary,
          title: file.title
        });
      }
    });
  } else if (courseId) {
    snapshot.files
      .filter((file) => file.courseId === courseId)
      .slice(0, 3)
      .forEach((file) => {
        scopedResults.push({
          citation: file.citation,
          courseId: file.courseId,
          fileResourceId: file.id,
          id: file.id,
          relevance: 1,
          sourceType: "file",
          summary: file.summary,
          title: file.title
        });
      });
  }

  const deduped = new Map<string, SearchResult>();
  const filteredResults = assignment
    ? results.filter((result) => result.assignmentId === assignment.id || result.courseId === assignment.courseId)
    : results;

  [...scopedResults, ...filteredResults].forEach((result) => {
    deduped.set(`${result.sourceType}:${result.id}`, result);
  });

  return [...deduped.values()].slice(0, 8);
}
