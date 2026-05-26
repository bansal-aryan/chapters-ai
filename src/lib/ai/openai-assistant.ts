import type { SearchResult } from "@/types";
import { aiTutorPolicy } from "@/lib/ai/policy";
import type { WorkspaceSnapshot } from "@/lib/supabase/workspace";

type GenerateAssistantInput = {
  message: string;
  results: SearchResult[];
  snapshot: WorkspaceSnapshot | null;
};

type OpenAIResponse = {
  output_text?: string;
};

export async function generateOpenAIAssistantResponse({
  message,
  results,
  snapshot
}: GenerateAssistantInput): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: buildInput({ message, results, snapshot }),
      instructions: [
        "You are chapters.ai, a study assistant for students.",
        aiTutorPolicy.homeworkBoundary,
        "Use the student's synced assignments, prior assignments, files, and search results as context.",
        "Do not fabricate course facts. If context is insufficient, ask for the missing material.",
        "Keep replies concise, actionable, and cite result titles when useful."
      ].join("\n"),
      model: process.env.OPENAI_MODEL ?? "gpt-5.2"
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
  return payload?.output_text?.trim() || null;
}

function buildInput({ message, results, snapshot }: GenerateAssistantInput) {
  const assignments = snapshot?.assignments ?? [];
  const courses = snapshot?.courses ?? [];
  const files = snapshot?.files ?? [];
  const courseNameById = new Map(courses.map((course) => [course.id, course.name]));
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
        assignments: assignmentContext,
        files: fileContext,
        searchResults: searchContext
      },
      null,
      2
    ),
    "",
    `Student question: ${message}`
  ].join("\n");
}
