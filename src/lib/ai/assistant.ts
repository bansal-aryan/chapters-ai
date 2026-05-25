import type { SearchResult } from "@/types";
import { aiTutorPolicy } from "@/lib/ai/policy";
import type { WorkspaceSnapshot } from "@/lib/supabase/workspace";
import { getPriorityRank } from "@/lib/domain/prioritization";

type BuildAssistantResponseInput = {
  message: string;
  results: SearchResult[];
  snapshot: WorkspaceSnapshot | null;
};

export function buildAssistantResponse({
  message,
  results,
  snapshot
}: BuildAssistantResponseInput): string {
  const normalizedMessage = message.toLowerCase();
  const topAssignment = snapshot ? getPriorityRank(snapshot.assignments)[0] : null;
  const wantsAnswerCheck =
    normalizedMessage.includes("check") ||
    normalizedMessage.includes("answer") ||
    normalizedMessage.includes("right") ||
    normalizedMessage.includes("wrong");

  const lines = [
    "I can help you move this forward without doing the assignment for you.",
    aiTutorPolicy.homeworkBoundary
  ];

  if (wantsAnswerCheck) {
    lines.push("Paste your attempt first, and I will mark what is solid, what needs revision, and which concept to revisit.");
  }

  if (topAssignment) {
    lines.push(
      `Your current highest-priority task is ${topAssignment.title}. A good next step is: ${topAssignment.summary}`
    );
  }

  if (results.length) {
    const citations = results
      .slice(0, 3)
      .map((result) => `${result.title}${result.citation ? ` (${result.citation})` : ""}`)
      .join("; ");

    lines.push(`Relevant materials I found: ${citations}.`);
  } else {
    lines.push("I did not find a directly matching course material yet, so I would start from the assignment prompt and nearest due date.");
  }

  lines.push("Tell me what you have tried so far, and I will guide the next step.");

  return lines.join("\n\n");
}
