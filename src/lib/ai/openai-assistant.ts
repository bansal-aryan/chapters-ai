import type { SearchResult } from "@/types";
import { aiTutorPolicy } from "@/lib/ai/policy";
import {
  type TutorContextPacket,
  type TutorIntent,
  type TutorResponse,
  ensureTutorResponseQuality,
  formatTutorResponse,
  parseTutorResponse
} from "@/lib/ai/tutor";
import type { WorkspaceSnapshot } from "@/lib/supabase/workspace";

export type AssistantHistoryMessage = {
  content: string;
  role: "assistant" | "user";
};

type GenerateAssistantInput = {
  assignmentId?: string | null;
  context: TutorContextPacket;
  courseId?: string | null;
  intent: TutorIntent;
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
  tutorResponse: TutorResponse;
};

export async function generateOpenAIAssistantResponse({
  assignmentId,
  context,
  courseId,
  intent,
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
      input: buildInput({ assignmentId, context, courseId, intent, message, recentMessages, results, snapshot }),
      instructions: [
        "You are chapters.ai, an assignment-specific AI tutor for high school and college students.",
        aiTutorPolicy.productRole,
        aiTutorPolicy.homeworkBoundary,
        aiTutorPolicy.citationRequirement,
        "Use the selected assignment and sources as the center of the answer. Do not drift into unrelated classes unless no assignment is selected or the student asks to prioritize across classes.",
        "Be a tutor: diagnose what the assignment is asking, give concrete next moves, ask one useful question, and adapt to the student's attempt.",
        "Every response must make a specific connection to the selected assignment title, prompt, source, rubric, or due/status context.",
        "For quiz requests, ask one question at a time and wait for the student's answer.",
        "For essay or answer checking, ask for the student's attempt before giving corrections.",
        "Do not fabricate course facts. If context is insufficient, ask for the missing material.",
        "Keep replies concise, specific, and warm. Avoid generic productivity advice."
      ].join("\n"),
      max_output_tokens: 700,
      metadata: {
        product: "chapters-ai",
        surface: "assistant"
      },
      model,
      text: {
        format: tutorResponseTextFormat
      }
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
  const parsedResponse = ensureTutorResponseQuality(parseTutorResponse(payload?.output_text) ?? nullTutorResponse(intent), context);
  const content = formatTutorResponse(parsedResponse);

  return content ? { content, model, responseId: payload?.id, tutorResponse: parsedResponse } : null;
}

function buildInput({
  assignmentId,
  context,
  courseId,
  intent,
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
        assignmentScopedRules: context.selectedAssignment
          ? [
              `Selected assignment title: ${context.selectedAssignment.title}`,
              "Answer this assignment first.",
              "Only cite sources in the supplied sources or retrievedSources arrays.",
              "If you need the student's draft/attempt, ask for it instead of inventing one."
            ]
          : [],
        contextPacket: context,
        currentDate: new Date().toISOString(),
        detectedIntent: intent,
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

function nullTutorResponse(intent: TutorIntent): TutorResponse {
  return {
    assignmentConnection: "I could not read enough structured context for this answer.",
    citations: [],
    confidence: "low",
    directAnswer: "I need a little more context before I can tutor this well.",
    intent,
    missingContext: ["assignment context"],
    needsMoreContext: true,
    nextSteps: [
      {
        detail: "Open the assignment again or paste the exact prompt.",
        label: "Restore context"
      }
    ],
    tutorQuestion: "What exact assignment prompt should we work from?"
  };
}

const tutorResponseTextFormat = {
  description: "Structured tutor response for a student assignment assistant.",
  name: "assignment_tutor_response",
  schema: {
    additionalProperties: false,
    properties: {
      assignmentConnection: {
        type: "string"
      },
      citations: {
        items: {
          additionalProperties: false,
          properties: {
            reason: {
              type: "string"
            },
            title: {
              type: "string"
            }
          },
          required: ["title", "reason"],
          type: "object"
        },
        type: "array"
      },
      confidence: {
        enum: ["high", "medium", "low"],
        type: "string"
      },
      directAnswer: {
        type: "string"
      },
      intent: {
        enum: [
          "check_attempt",
          "explain_prompt",
          "general",
          "priority",
          "quiz",
          "stuck_hint",
          "study_plan",
          "summarize_material"
        ],
        type: "string"
      },
      missingContext: {
        items: {
          type: "string"
        },
        type: "array"
      },
      needsMoreContext: {
        type: "boolean"
      },
      nextSteps: {
        items: {
          additionalProperties: false,
          properties: {
            detail: {
              type: "string"
            },
            label: {
              type: "string"
            }
          },
          required: ["label", "detail"],
          type: "object"
        },
        type: "array"
      },
      tutorQuestion: {
        type: "string"
      }
    },
    required: [
      "intent",
      "directAnswer",
      "assignmentConnection",
      "nextSteps",
      "tutorQuestion",
      "citations",
      "needsMoreContext",
      "missingContext",
      "confidence"
    ],
    type: "object"
  },
  strict: true,
  type: "json_schema"
} as const;
