import { type NextRequest, NextResponse } from "next/server";
import { buildAssistantTutorResponse } from "@/lib/ai/assistant";
import {
  type AssistantHistoryMessage,
  generateOpenAIAssistantResponse
} from "@/lib/ai/openai-assistant";
import {
  buildTutorContextPacket,
  buildTutorSearchQuery,
  detectTutorIntent,
  formatTutorResponse
} from "@/lib/ai/tutor";
import {
  type StoredAssistantChatMessage,
  mapAssistantThreadSummary,
  mapStoredAssistantMessage
} from "@/lib/ai/chat-history";
import { getDemoWorkspaceSnapshot } from "@/lib/domain/demo-store";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import type { Json } from "@/lib/supabase/database.types";
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

const chatThreadSelect = "id, title, scope, course_id, assignment_id, created_at, updated_at";
const chatMessageSelect = "id, role, content, metadata, created_at";

function normalizeScope(value: unknown): ChatScope {
  if (value === "class" || value === "assignment" || value === "global") {
    return value;
  }

  return "global";
}

function normalizeOptionalId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET(request: NextRequest) {
  const limit = checkRateLimit(request, "assistant-history", {
    limit: 60,
    windowMs: 5 * 60 * 1000
  });

  if (!limit.ok) {
    return rateLimitResponse(limit);
  }

  if (request.cookies.get("chapters_demo_session")?.value === "1") {
    return NextResponse.json({ messages: [], threads: [] }, { headers: limit.headers });
  }

  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    return auth.error;
  }

  const { supabase, user } = auth;
  const requestedThreadId = normalizeOptionalId(request.nextUrl.searchParams.get("threadId"));
  const snapshot = await getWorkspaceSnapshotFromSupabase({ allowEmpty: true });
  const { data: threadRows, error: threadsError } = await supabase
    .from("chat_threads")
    .select(chatThreadSelect)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (threadsError) {
    return NextResponse.json({ error: threadsError.message }, { status: 400 });
  }

  const threads = (threadRows ?? []).map((thread) => mapAssistantThreadSummary(thread, snapshot));
  let activeThread = requestedThreadId ? threads.find((thread) => thread.id === requestedThreadId) ?? null : null;
  let messages: StoredAssistantChatMessage[] = [];

  if (requestedThreadId) {
    let ownedThreadId: string | null = activeThread?.id ?? null;

    if (!ownedThreadId) {
      const { data: threadRow, error: threadError } = await supabase
        .from("chat_threads")
        .select(chatThreadSelect)
        .eq("id", requestedThreadId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (threadError) {
        return NextResponse.json({ error: threadError.message }, { status: 400 });
      }

      if (!threadRow) {
        return NextResponse.json({ error: "Chat thread not found." }, { status: 404 });
      }

      ownedThreadId = threadRow.id;
      activeThread = mapAssistantThreadSummary(threadRow, snapshot);
    }

    const { data: messageRows, error: messagesError } = await supabase
      .from("chat_messages")
      .select(chatMessageSelect)
      .eq("thread_id", ownedThreadId)
      .eq("user_id", user.id)
      .in("role", ["assistant", "user"])
      .order("created_at", { ascending: true })
      .limit(100);

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 400 });
    }

    messages = (messageRows ?? [])
      .map(mapStoredAssistantMessage)
      .filter((message): message is StoredAssistantChatMessage => Boolean(message));
  }

  return NextResponse.json({ messages, thread: activeThread, threads }, { headers: limit.headers });
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
    const searchQuery = buildTutorSearchQuery({ assignmentId, courseId, message, snapshot });
    const results = withScopedResults(snapshot, searchDemoWorkspaceText(searchQuery, { courseId, limit: 8 }), {
      assignmentId,
      courseId
    });
    const threadId = requestedThreadId ?? `demo-thread-${scope}-${assignmentId ?? courseId ?? "global"}`;
    const tutorResponse = buildAssistantTutorResponse({
      assignmentId,
      courseId,
      message,
      recentMessages: clientRecentMessages,
      results,
      snapshot
    });
    const assistantContent = formatTutorResponse(tutorResponse);

    return NextResponse.json(
      {
        citations: results,
        message: {
          citation_resource_ids: results.map((result) => result.fileResourceId).filter(Boolean),
          content: assistantContent,
          id: `demo-message-${Date.now()}`,
          metadata: {
            intent: tutorResponse.intent,
            provider: "fallback",
            tutor_response: tutorResponse
          },
          role: "assistant",
          thread_id: threadId
        },
        provider: "fallback",
        thread: mapAssistantThreadSummary(
          {
            assignment_id: assignmentId,
            course_id: courseId,
            created_at: new Date().toISOString(),
            id: threadId,
            scope,
            title: message.slice(0, 72),
            updated_at: new Date().toISOString()
          },
          snapshot
        ),
        tutorResponse,
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

  const snapshot = await getWorkspaceSnapshotFromSupabase({ allowEmpty: true });
  const intent = detectTutorIntent(message);
  const searchQuery = buildTutorSearchQuery({ assignmentId, courseId, message, snapshot });
  const results = await searchWorkspaceText(supabase, searchQuery, { courseId, limit: 8 });
  const scopedResults = withScopedResults(snapshot, results, { assignmentId, courseId });
  const context = buildTutorContextPacket({
    assignmentId,
    courseId,
    recentMessages,
    results: scopedResults,
    snapshot
  });
  const openAIResult = await generateOpenAIAssistantResponse({
    assignmentId,
    context,
    courseId,
    intent,
    message,
    recentMessages,
    results: scopedResults,
    snapshot
  });
  const tutorResponse =
    openAIResult?.tutorResponse ??
    buildAssistantTutorResponse({ assignmentId, courseId, message, recentMessages, results: scopedResults, snapshot });
  const assistantContent = openAIResult?.content ?? formatTutorResponse(tutorResponse);
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
      metadata: removeUndefined({
        intent: tutorResponse.intent,
        model: openAIResult?.model,
        openai_response_id: openAIResult?.responseId,
        policy: "guide_do_not_complete",
        provider: openAIResult ? "openai" : "fallback",
        search_result_ids: scopedResults.map((result) => result.id),
        tutor_response: tutorResponse as unknown as Json
      })
    })
    .select("*")
    .single();

  if (assistantError) {
    return NextResponse.json({ error: assistantError.message }, { status: 400 });
  }

  const { data: threadRow } = await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId)
    .eq("user_id", user.id)
    .select(chatThreadSelect)
    .single();

  return NextResponse.json(
    {
      citations: scopedResults,
      message: assistantMessage,
      provider: openAIResult ? "openai" : "fallback",
      thread: threadRow ? mapAssistantThreadSummary(threadRow, snapshot) : null,
      tutorResponse,
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
      .eq("user_id", user.id)
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

    assignment.relatedAssignmentIds.forEach((relatedAssignmentId) => {
      const relatedAssignment = snapshot.assignments.find((item) => item.id === relatedAssignmentId);

      if (relatedAssignment) {
        scopedResults.push({
          assignmentId: relatedAssignment.id,
          citation: courseNameById.get(relatedAssignment.courseId) ?? "Related assignment",
          courseId: relatedAssignment.courseId,
          id: relatedAssignment.id,
          relevance: 0.9,
          sourceType: "assignment",
          summary: relatedAssignment.summary,
          title: relatedAssignment.title
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

function removeUndefined(value: Record<string, Json | undefined>) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Json;
}
