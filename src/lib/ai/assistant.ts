import type { SearchResult } from "@/types";
import { aiTutorPolicy } from "@/lib/ai/policy";
import type { WorkspaceSnapshot } from "@/lib/supabase/workspace";
import { formatEffort, getPriorityRank, getPriorityReason } from "@/lib/domain/prioritization";
import type { AssistantHistoryMessage } from "@/lib/ai/openai-assistant";

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
  const normalizedMessage = message.toLowerCase();
  const selectedAssignment = assignmentId
    ? snapshot?.assignments.find((assignment) => assignment.id === assignmentId)
    : null;
  const selectedCourse = courseId ? snapshot?.courses.find((course) => course.id === courseId) : null;
  const topAssignment = selectedAssignment ?? (snapshot ? getPriorityRank(snapshot.assignments)[0] : null);
  const wantsAnswerCheck =
    normalizedMessage.includes("check") ||
    normalizedMessage.includes("answer") ||
    normalizedMessage.includes("right") ||
    normalizedMessage.includes("wrong");
  const wantsQuiz = normalizedMessage.includes("quiz");
  const wantsStudyPlan =
    normalizedMessage.includes("study plan") ||
    normalizedMessage.includes("plan") ||
    normalizedMessage.includes("study first") ||
    normalizedMessage.includes("prioritize");
  const wantsSummary = normalizedMessage.includes("summarize") || normalizedMessage.includes("summary");
  const lines = [getOpeningLine({ recentMessages, selectedAssignment, selectedCourse })];

  if (wantsAnswerCheck) {
    lines.push("Paste your attempt first. I will mark what is solid, what needs revision, and which concept to revisit without writing the final answer for you.");
  }

  if (wantsQuiz && topAssignment) {
    lines.push(`First quiz question for ${topAssignment.title}: what is the main idea or skill this assignment is testing? Reply with your best answer and I will check it.`);
  } else if (wantsStudyPlan && selectedAssignment) {
    lines.push(
      [
        `A focused plan for ${selectedAssignment.title}:`,
        `1. Spend 5 minutes reading the prompt and marking what each problem is asking for.`,
        `2. Spend ${formatEffort(Math.max(30, Math.round(selectedAssignment.estimatedEffortMinutes * 0.6)))} on the hardest setup work first.`,
        "3. Write down one attempt or stuck point, then bring it back here for feedback.",
        `Priority note: ${getPriorityReason(selectedAssignment)}`
      ].join("\n")
    );
  } else if (wantsStudyPlan && snapshot?.assignments.length) {
    const planItems = getPriorityRank(snapshot.assignments)
      .slice(0, 3)
      .map((assignment, index) => `${index + 1}. ${assignment.title} - ${getPriorityReason(assignment)} Estimate: ${formatEffort(assignment.estimatedEffortMinutes)}.`)
      .join("\n");

    lines.push(`Start here:\n${planItems}`);
  } else if (wantsSummary && results.length) {
    lines.push(`The most relevant material looks like ${results[0].title}: ${results[0].summary}`);
  } else if (topAssignment) {
    lines.push(`For ${topAssignment.title}, the next useful move is: ${topAssignment.summary}`);
    lines.push(`Why it matters now: ${getPriorityReason(topAssignment)} Estimated effort: ${formatEffort(topAssignment.estimatedEffortMinutes)}.`);
  }

  if (results.length) {
    const citations = results
      .slice(0, 3)
      .map((result) => `${result.title}${result.citation ? ` (${result.citation})` : ""}`)
      .join("; ");

    lines.push(`Relevant materials I found: ${citations}.`);
  } else {
    lines.push("I did not find a directly matching course material yet. Connect Canvas or open a specific assignment so I can cite the right source.");
  }

  lines.push("Tell me what you have tried so far, and I will guide the next step.");

  return lines.join("\n\n");
}

function getOpeningLine({
  recentMessages,
  selectedAssignment,
  selectedCourse
}: {
  recentMessages: AssistantHistoryMessage[];
  selectedAssignment?: WorkspaceSnapshot["assignments"][number] | null;
  selectedCourse?: WorkspaceSnapshot["courses"][number] | null;
}) {
  if (recentMessages.length) {
    return "Got it. I will keep the thread focused and build on what we just discussed.";
  }

  if (selectedAssignment) {
    return `I am scoped to ${selectedAssignment.title}. ${aiTutorPolicy.homeworkBoundary}`;
  }

  if (selectedCourse) {
    return `I am scoped to ${selectedCourse.name}. ${aiTutorPolicy.homeworkBoundary}`;
  }

  return `I can help you move this forward without doing the assignment for you. ${aiTutorPolicy.homeworkBoundary}`;
}
