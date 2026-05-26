import type { SearchResult } from "@/types";
import { aiTutorPolicy } from "@/lib/ai/policy";
import type { WorkspaceSnapshot } from "@/lib/supabase/workspace";

export type AssistantHistoryMessage = {
  content: string;
  role: "assistant" | "user";
};

type GenerateAssistantInput = {
  assignmentId?: string | null;
  courseId?: string | null;
  message: string;
  recentMessages?: AssistantHistoryMessage[];
  results: SearchResult[];
  snapshot: WorkspaceSnapshot | null;
};

type OpenAIResponse = {
  id?: string;
  output_text?: string;
};

export type OpenAIAssistantResult = {
  content: string;
  model: string;
  responseId?: string;
};

export async function generateOpenAIAssistantResponse({
  assignmentId,
  courseId,
  message,
  recentMessages = [],
  results,
  snapshot
}: GenerateAssistantInput): Promise<OpenAIAssistantResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-5.2";

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: buildInput({ assignmentId, courseId, message, recentMessages, results, snapshot }),
      instructions: [
        "You are chapters.ai, a calm AI study copilot for high school and college students.",
        aiTutorPolicy.productRole,
        aiTutorPolicy.homeworkBoundary,
        aiTutorPolicy.citationRequirement,
        "Use the student's synced assignments, previous assignments, files, search results, and recent chat turns as context.",
        "If an assignment is selected, answer for that assignment first. If no assignment is selected, prioritize the most urgent unfinished work.",
        "Use this answer shape unless the user asks for something else: direct answer, next 2-4 steps, sources or what is missing.",
        "For quiz requests, ask one question at a time and wait for the student's answer.",
        "For essay or answer checking, ask for the student's attempt before giving corrections.",
        "Do not fabricate course facts. If context is insufficient, ask for the missing material.",
        "Keep replies concise, specific, and warm. Avoid generic disclaimers beyond the necessary tutoring boundary."
      ].join("\n"),
      max_output_tokens: 700,
      metadata: {
        product: "chapters-ai",
        surface: "assistant"
      },
      model
    }),
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    method: "POST"
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as OpenAIResponse | null;
  const content = payload?.output_text?.trim();

  return content ? { content, model, responseId: payload?.id } : null;
}

function buildInput({
  assignmentId,
  courseId,
  message,
  recentMessages = [],
  results,
  snapshot
}: GenerateAssistantInput) {
  const assignments = snapshot?.assignments ?? [];
  const courses = snapshot?.courses ?? [];
  const files = snapshot?.files ?? [];
  const courseNameById = new Map(courses.map((course) => [course.id, course.name]));
  const selectedAssignment = assignmentId ? assignments.find((assignment) => assignment.id === assignmentId) : null;
  const selectedCourse = courseId ? courses.find((course) => course.id === courseId) : null;
  const assignmentContext = assignments
    .slice(0, 25)
    .map((assignment) => ({
      course: courseNameById.get(assignment.courseId) ?? "Unknown course",
      description: assignment.description,
      dueDate: assignment.dueDate,
      estimatedEffortMinutes: assignment.estimatedEffortMinutes,
      status: assignment.status,
      summary: assignment.summary,
      title: assignment.title
    }));
  const fileContext = files.slice(0, 20).map((file) => ({
    citation: file.citation,
    course: courseNameById.get(file.courseId) ?? "Unknown course",
    summary: file.summary,
    title: file.title,
    type: file.type
  }));
  const searchContext = results.map((result) => ({
    citation: result.citation,
    sourceType: result.sourceType,
    summary: result.summary,
    title: result.title
  }));

  return [
    "Student workspace context:",
    JSON.stringify(
      {
        currentDate: new Date().toISOString(),
        assignments: assignmentContext,
        files: fileContext,
        recentMessages: recentMessages.slice(-8),
        searchResults: searchContext,
        selectedAssignment: selectedAssignment
          ? {
              course: courseNameById.get(selectedAssignment.courseId) ?? "Unknown course",
              description: selectedAssignment.description,
              dueDate: selectedAssignment.dueDate,
              estimatedEffortMinutes: selectedAssignment.estimatedEffortMinutes,
              status: selectedAssignment.status,
              summary: selectedAssignment.summary,
              title: selectedAssignment.title
            }
          : null,
        selectedCourse: selectedCourse
          ? {
              code: selectedCourse.code,
              name: selectedCourse.name,
              term: selectedCourse.term
            }
          : null
      },
      null,
      2
    ),
    "",
    `Student question: ${message}`
  ].join("\n");
}
