import { normalizeTutorResponse, type TutorResponse } from "@/lib/ai/tutor";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { WorkspaceSnapshot } from "@/lib/supabase/workspace";

export type AssistantThreadSummary = {
  assignmentId?: string;
  contextSubtitle: string;
  contextTitle: string;
  courseId?: string;
  createdAt: string;
  id: string;
  scope: "assignment" | "class" | "global";
  title: string;
  updatedAt: string;
};

export type StoredAssistantChatMessage = {
  content: string;
  createdAt?: string;
  id: string;
  provider?: "fallback" | "openai";
  role: "assistant" | "user";
  tutorResponse?: TutorResponse;
};

type ChatThreadRow = Pick<
  Database["public"]["Tables"]["chat_threads"]["Row"],
  "assignment_id" | "course_id" | "created_at" | "id" | "scope" | "title" | "updated_at"
>;

type ChatMessageRow = Pick<
  Database["public"]["Tables"]["chat_messages"]["Row"],
  "content" | "created_at" | "id" | "metadata" | "role"
>;

export function mapAssistantThreadSummary(
  thread: ChatThreadRow,
  snapshot: WorkspaceSnapshot | null
): AssistantThreadSummary {
  const assignment = thread.assignment_id
    ? snapshot?.assignments.find((item) => item.id === thread.assignment_id)
    : null;
  const course = thread.course_id
    ? snapshot?.courses.find((item) => item.id === thread.course_id)
    : assignment
      ? snapshot?.courses.find((item) => item.id === assignment.courseId)
      : null;

  return {
    assignmentId: thread.assignment_id ?? undefined,
    contextSubtitle:
      assignment && course
        ? course.name
        : course
          ? [course.code, course.term].filter(Boolean).join(" - ")
          : thread.scope === "global"
            ? "Workspace"
            : "",
    contextTitle: assignment?.title ?? course?.name ?? "Workspace assistant",
    courseId: thread.course_id ?? undefined,
    createdAt: thread.created_at,
    id: thread.id,
    scope: thread.scope,
    title: thread.title,
    updatedAt: thread.updated_at
  };
}

export function mapStoredAssistantMessage(message: ChatMessageRow): StoredAssistantChatMessage | null {
  if (message.role !== "assistant" && message.role !== "user") {
    return null;
  }

  return {
    content: message.content,
    createdAt: message.created_at,
    id: message.id,
    provider: getProviderFromMetadata(message.metadata),
    role: message.role,
    tutorResponse: getTutorResponseFromMetadata(message.metadata)
  };
}

function getProviderFromMetadata(metadata: Json): "fallback" | "openai" | undefined {
  const value = getRecord(metadata)?.provider;

  return value === "fallback" || value === "openai" ? value : undefined;
}

function getTutorResponseFromMetadata(metadata: Json) {
  const value = getRecord(metadata)?.tutor_response;

  return normalizeTutorResponse(value) ?? undefined;
}

function getRecord(value: Json): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
