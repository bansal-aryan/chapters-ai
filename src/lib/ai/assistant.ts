import type { SearchResult } from "@/types";
import type { WorkspaceSnapshot } from "@/lib/supabase/workspace";
import type { AssistantHistoryMessage } from "@/lib/ai/openai-assistant";
import {
  type TutorResponse,
  buildFallbackTutorResponse,
  buildTutorContextPacket,
  detectTutorIntent,
  formatTutorResponse
} from "@/lib/ai/tutor";

type BuildAssistantResponseInput = {
  assignmentId?: string | null;
  courseId?: string | null;
  message: string;
  recentMessages?: AssistantHistoryMessage[];
  results: SearchResult[];
  snapshot: WorkspaceSnapshot | null;
};

export function buildAssistantResponse({
  assignmentId,
  courseId,
  message,
  recentMessages = [],
  results,
  snapshot
}: BuildAssistantResponseInput): string {
  return formatTutorResponse(
    buildAssistantTutorResponse({
      assignmentId,
      courseId,
      message,
      recentMessages,
      results,
      snapshot
    })
  );
}

export function buildAssistantTutorResponse({
  assignmentId,
  courseId,
  message,
  recentMessages,
  results,
  snapshot
}: BuildAssistantResponseInput): TutorResponse {
  const context = buildTutorContextPacket({
    assignmentId,
    courseId,
    recentMessages,
    results,
    snapshot
  });
  return buildFallbackTutorResponse({
    context,
    intent: detectTutorIntent(message),
    message
  });
}
