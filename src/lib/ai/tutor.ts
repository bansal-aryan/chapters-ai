import type { Assignment, FileResource, SearchResult } from "@/types";
import { formatEffort, getPriorityRank, getPriorityReason } from "@/lib/domain/prioritization";
import type { AssistantHistoryMessage } from "@/lib/ai/openai-assistant";
import type { WorkspaceSnapshot } from "@/lib/supabase/workspace";

export type TutorIntent =
  | "check_attempt"
  | "explain_prompt"
  | "general"
  | "priority"
  | "quiz"
  | "stuck_hint"
  | "study_plan"
  | "summarize_material";

export type TutorResponse = {
  assignmentConnection: string;
  citations: Array<{
    reason: string;
    title: string;
  }>;
  confidence: "high" | "low" | "medium";
  directAnswer: string;
  intent: TutorIntent;
  missingContext: string[];
  needsMoreContext: boolean;
  nextSteps: Array<{
    detail: string;
    label: string;
  }>;
  tutorQuestion: string;
};

export type TutorContextPacket = {
  currentDate: string;
  missingContext: string[];
  priorityQueue: Array<{
    dueDate: string;
    priorityReason: string;
    status: string;
    title: string;
  }>;
  recentMessages: AssistantHistoryMessage[];
  retrievedSources: Array<{
    citation: string;
    summary: string;
    title: string;
    type: SearchResult["sourceType"];
  }>;
  selectedAssignment: null | {
    course: string;
    description: string;
    dueDate: string;
    estimatedEffort: string;
    priorityReason: string;
    status: string;
    summary: string;
    title: string;
  };
  selectedCourse: null | {
    code: string;
    name: string;
    term: string;
  };
  sources: Array<{
    citation: string;
    summary: string;
    title: string;
    type: FileResource["type"] | "assignment" | "prior_assignment";
  }>;
};

type BuildTutorContextInput = {
  assignmentId?: string | null;
  courseId?: string | null;
  recentMessages?: AssistantHistoryMessage[];
  results: SearchResult[];
  snapshot: WorkspaceSnapshot | null;
};

type BuildTutorResponseInput = {
  context: TutorContextPacket;
  intent: TutorIntent;
  message: string;
};

const answerCheckPatterns = [
  "check",
  "is this right",
  "is my answer",
  "grade",
  "feedback",
  "review my",
  "does this work"
];

export function detectTutorIntent(message: string): TutorIntent {
  const normalized = message.toLowerCase();

  if (answerCheckPatterns.some((pattern) => normalized.includes(pattern))) {
    return "check_attempt";
  }

  if (normalized.includes("quiz") || normalized.includes("test me")) {
    return "quiz";
  }

  if (normalized.includes("stuck") || normalized.includes("hint") || normalized.includes("don't understand")) {
    return "stuck_hint";
  }

  if (normalized.includes("summarize") || normalized.includes("summary") || normalized.includes("notes")) {
    return "summarize_material";
  }

  if (normalized.includes("study plan") || normalized.includes("plan") || normalized.includes("what do i do next")) {
    return "study_plan";
  }

  if (normalized.includes("priority") || normalized.includes("study first") || normalized.includes("most important")) {
    return "priority";
  }

  if (normalized.includes("explain") || normalized.includes("break down") || normalized.includes("prompt")) {
    return "explain_prompt";
  }

  return "general";
}

export function buildTutorSearchQuery({
  assignmentId,
  courseId,
  message,
  snapshot
}: {
  assignmentId?: string | null;
  courseId?: string | null;
  message: string;
  snapshot: WorkspaceSnapshot | null;
}) {
  const assignments = snapshot?.assignments ?? [];
  const files = snapshot?.files ?? [];
  const assignment = assignmentId ? assignments.find((item) => item.id === assignmentId) : null;

  if (!assignment) {
    return message;
  }

  const relatedTitles = files
    .filter((file) => assignment.relatedFileIds.includes(file.id))
    .map((file) => file.title)
    .join(" ");

  return [
    message,
    assignment.title,
    assignment.summary,
    assignment.description,
    relatedTitles,
    courseId
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildTutorContextPacket({
  assignmentId,
  courseId,
  recentMessages = [],
  results,
  snapshot
}: BuildTutorContextInput): TutorContextPacket {
  const assignments = snapshot?.assignments ?? [];
  const courses = snapshot?.courses ?? [];
  const files = snapshot?.files ?? [];
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const selectedAssignment = assignmentId ? assignments.find((assignment) => assignment.id === assignmentId) : null;
  const selectedCourse = selectedAssignment
    ? courseById.get(selectedAssignment.courseId) ?? null
    : courseId
      ? courses.find((course) => course.id === courseId) ?? null
      : null;
  const relatedFiles = selectedAssignment
    ? files.filter((file) => selectedAssignment.relatedFileIds.includes(file.id))
    : selectedCourse
      ? files.filter((file) => file.courseId === selectedCourse.id).slice(0, 5)
      : [];
  const relatedAssignments = selectedAssignment
    ? assignments.filter((assignment) => selectedAssignment.relatedAssignmentIds.includes(assignment.id))
    : [];
  const sources = [
    ...(selectedAssignment
      ? [
          {
            citation: courseById.get(selectedAssignment.courseId)?.name ?? "Assignment",
            summary: selectedAssignment.summary,
            title: selectedAssignment.title,
            type: "assignment" as const
          }
        ]
      : []),
    ...relatedFiles.map((file) => ({
      citation: file.citation,
      summary: file.summary,
      title: file.title,
      type: file.type
    })),
    ...relatedAssignments.map((assignment) => ({
      citation: courseById.get(assignment.courseId)?.name ?? "Prior assignment",
      summary: assignment.summary,
      title: assignment.title,
      type: "prior_assignment" as const
    }))
  ];
  const missingContext = getMissingContext({
    hasAssignments: assignments.length > 0,
    relatedFiles,
    selectedAssignment
  });

  return {
    currentDate: new Date().toISOString(),
    missingContext,
    priorityQueue: selectedAssignment
      ? []
      : getPriorityRank(assignments)
          .slice(0, 5)
          .map((assignment) => ({
            dueDate: assignment.dueDate,
            priorityReason: getPriorityReason(assignment),
            status: assignment.status,
            title: assignment.title
          })),
    recentMessages: recentMessages.slice(-8),
    retrievedSources: results.map((result) => ({
      citation: result.citation,
      summary: result.summary,
      title: result.title,
      type: result.sourceType
    })),
    selectedAssignment: selectedAssignment
      ? {
          course: selectedCourse?.name ?? "Unknown course",
          description: selectedAssignment.description,
          dueDate: selectedAssignment.dueDate,
          estimatedEffort: formatEffort(selectedAssignment.estimatedEffortMinutes),
          priorityReason: getPriorityReason(selectedAssignment),
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
      : null,
    sources
  };
}

export function buildFallbackTutorResponse({
  context,
  intent,
  message
}: BuildTutorResponseInput): TutorResponse {
  const assignment = context.selectedAssignment;
  const primarySource = context.sources[0] ?? context.retrievedSources[0] ?? null;

  if (intent === "check_attempt") {
    return ensureTutorResponseQuality(
      {
        assignmentConnection: assignment
          ? `For ${assignment.title}, I need to compare your work against the prompt before judging it.`
          : "I need your attempt before I can check the work fairly.",
        citations: getContextCitations(context, "Used as the assignment context for checking the attempt."),
        confidence: assignment ? "medium" : "low",
        directAnswer: "Paste your attempt or a screenshot transcription first. I will point out what is correct, what is shaky, and the next concept to revisit without writing the final answer for you.",
        intent,
        missingContext: context.missingContext,
        needsMoreContext: true,
        nextSteps: [
          { label: "Share your work", detail: "Paste the answer you want checked, including any reasoning you wrote." },
          { label: "Name the stuck point", detail: "Tell me which step felt uncertain so I can focus feedback there." }
        ],
        tutorQuestion: assignment
          ? `What part of ${assignment.title} do you want me to check first?`
          : "What answer or draft should we check?"
      },
      context
    );
  }

  if (intent === "quiz") {
    return ensureTutorResponseQuality(
      {
        assignmentConnection: assignment
          ? `This question targets the core skill in ${assignment.title}: ${assignment.summary}`
          : "This question targets your highest-priority coursework.",
        citations: getContextCitations(context, "Used to choose the quiz focus."),
        confidence: primarySource ? "medium" : "low",
        directAnswer: "Let’s do one question at a time so I can adapt to your answer.",
        intent,
        missingContext: context.missingContext,
        needsMoreContext: false,
        nextSteps: [],
        tutorQuestion: assignment
          ? `For ${assignment.title}, what information from the prompt tells you which method or concept to use first?`
          : "What is the first assignment you want to be quizzed on?"
      },
      context
    );
  }

  if (intent === "study_plan" || intent === "priority") {
    return ensureTutorResponseQuality(
      buildStudyPlanResponse({ context, intent, message }),
      context
    );
  }

  if (intent === "summarize_material") {
    return ensureTutorResponseQuality(
      {
        assignmentConnection: assignment
          ? `For ${assignment.title}, the useful context is the assignment prompt plus ${context.sources.slice(1).map((source) => source.title).join(", ") || "any rubric or notes you upload"}.`
          : "I can summarize the strongest available course sources, but a selected assignment would make this sharper.",
        citations: getContextCitations(context, "Summarized for this tutoring answer."),
        confidence: primarySource ? "medium" : "low",
        directAnswer: primarySource
          ? `${primarySource.title}: ${primarySource.summary}`
          : "I do not have enough source material yet to summarize beyond the assignment list.",
        intent,
        missingContext: context.missingContext,
        needsMoreContext: !primarySource,
        nextSteps: [
          { label: "Open the main source", detail: primarySource ? `Start with ${primarySource.title}.` : "Connect Canvas or upload the rubric/notes." },
          { label: "Turn it into practice", detail: "After reading, ask me to quiz you on the exact ideas." }
        ],
        tutorQuestion: assignment
          ? `Which part of ${assignment.title} should I summarize more closely?`
          : "Which class or assignment should I summarize?"
      },
      context
    );
  }

  return ensureTutorResponseQuality(
    {
      assignmentConnection: assignment
        ? `For ${assignment.title}, the prompt says: ${assignment.description}`
        : "I can be much more specific when you open a single assignment.",
      citations: getContextCitations(context, "Used as source context for the explanation."),
      confidence: assignment ? "medium" : "low",
      directAnswer: assignment
        ? `Start by translating the assignment into one concrete task: ${assignment.summary}`
        : "Open the assignment you want help with, then ask me to break down the prompt.",
      intent,
      missingContext: context.missingContext,
      needsMoreContext: context.missingContext.length > 0,
      nextSteps: assignment
        ? [
            { label: "Find the task", detail: `Circle the verbs in the prompt: ${assignment.description}` },
            { label: "Gather source material", detail: context.sources[1] ? `Use ${context.sources[1].title} first.` : "Open the rubric, notes, or source packet for this assignment." },
            { label: "Make an attempt", detail: "Write one setup, claim, outline, or first answer, then bring it back for feedback." }
          ]
        : [
            { label: "Pick an assignment", detail: "Choose one assignment from the queue so I can tutor against the actual prompt." }
          ],
      tutorQuestion: assignment
        ? `What is the first sentence or problem in ${assignment.title} asking you to do?`
        : "Which assignment should we focus on?"
    },
    context
  );
}

export function ensureTutorResponseQuality(response: TutorResponse, context: TutorContextPacket): TutorResponse {
  const assignment = context.selectedAssignment;
  const allowedTitles = new Set([...context.sources, ...context.retrievedSources].map((source) => source.title));
  const citations = response.citations
    .filter((citation) => !allowedTitles.size || allowedTitles.has(citation.title))
    .slice(0, 4);

  if (assignment && !mentionsAssignment(response, assignment.title)) {
    response = {
      ...response,
      assignmentConnection: `For ${assignment.title}: ${response.assignmentConnection}`
    };
  }

  if (!citations.length && context.sources.length) {
    citations.push({
      reason: "Used as the selected assignment context.",
      title: context.sources[0].title
    });
  }

  return {
    ...response,
    citations,
    missingContext: [...new Set([...response.missingContext, ...context.missingContext])].slice(0, 4),
    needsMoreContext: response.needsMoreContext || context.missingContext.length > 0
  };
}

export function formatTutorResponse(response: TutorResponse) {
  const lines = [
    response.directAnswer,
    response.assignmentConnection
  ].filter(Boolean);

  if (response.nextSteps.length) {
    lines.push(
      [
        "Next steps:",
        ...response.nextSteps.map((step, index) => `${index + 1}. ${step.label}: ${step.detail}`)
      ].join("\n")
    );
  }

  if (response.tutorQuestion) {
    lines.push(`Tutor question: ${response.tutorQuestion}`);
  }

  if (response.needsMoreContext && response.missingContext.length) {
    lines.push(`Missing context: ${response.missingContext.join(", ")}.`);
  }

  if (response.citations.length) {
    lines.push(`Sources: ${response.citations.map((citation) => citation.title).join("; ")}.`);
  }

  return lines.join("\n\n");
}

export function parseTutorResponse(value: string | undefined): TutorResponse | null {
  if (!value) {
    return null;
  }

  try {
    return normalizeTutorResponse(JSON.parse(value));
  } catch {
    return null;
  }
}

export function normalizeTutorResponse(value: unknown): TutorResponse | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<TutorResponse>;
  const intent = isTutorIntent(candidate.intent) ? candidate.intent : "general";
  const directAnswer = typeof candidate.directAnswer === "string" ? candidate.directAnswer.trim() : "";
  const assignmentConnection =
    typeof candidate.assignmentConnection === "string" ? candidate.assignmentConnection.trim() : "";
  const tutorQuestion = typeof candidate.tutorQuestion === "string" ? candidate.tutorQuestion.trim() : "";

  if (!directAnswer || !assignmentConnection || !tutorQuestion) {
    return null;
  }

  return {
    assignmentConnection,
    citations: normalizeCitationList(candidate.citations),
    confidence: candidate.confidence === "high" || candidate.confidence === "medium" || candidate.confidence === "low"
      ? candidate.confidence
      : "medium",
    directAnswer,
    intent,
    missingContext: normalizeStringList(candidate.missingContext),
    needsMoreContext: Boolean(candidate.needsMoreContext),
    nextSteps: normalizeSteps(candidate.nextSteps),
    tutorQuestion
  };
}

function buildStudyPlanResponse({
  context,
  intent,
  message
}: BuildTutorResponseInput): TutorResponse {
  const assignment = context.selectedAssignment;
  const asksForShortPlan = message.includes("45") || message.toLowerCase().includes("short");

  if (assignment) {
    return {
      assignmentConnection: `${assignment.title} is ${assignment.status.replaceAll("_", " ")} and ${assignment.priorityReason.toLowerCase()}`,
      citations: getContextCitations(context, "Used to make the assignment-specific plan."),
      confidence: "high",
      directAnswer: asksForShortPlan
        ? `Use the next 45 minutes to make visible progress on ${assignment.title}, not to finish everything.`
        : `Your plan should stay centered on ${assignment.title}: understand the prompt, work the hardest part, then bring back an attempt for feedback.`,
      intent,
      missingContext: context.missingContext,
      needsMoreContext: context.missingContext.length > 0,
      nextSteps: asksForShortPlan
        ? [
            { label: "5 min prompt scan", detail: `Rewrite the task in your own words: ${assignment.description}` },
            { label: "30 min hard work", detail: `Work the hardest setup or first section using ${context.sources[1]?.title ?? "the most relevant notes"}.` },
            { label: "10 min check", detail: "Mark exactly where you are unsure and paste that attempt here." }
          ]
        : [
            { label: "Understand", detail: `Turn this prompt into a checklist: ${assignment.description}` },
            { label: "Work", detail: `Block about ${assignment.estimatedEffort} total, starting with the part most likely to slow you down.` },
            { label: "Review", detail: "Ask me to check your attempt before you polish or submit." }
          ],
      tutorQuestion: `Which part of ${assignment.title} feels hardest to start: understanding the prompt, choosing the method, or writing the first attempt?`
    };
  }

  return {
    assignmentConnection: "No single assignment is selected, so I am using the priority queue.",
    citations: getContextCitations(context, "Used to rank the work queue."),
    confidence: context.priorityQueue.length ? "medium" : "low",
    directAnswer: context.priorityQueue[0]
      ? `Start with ${context.priorityQueue[0].title}: ${context.priorityQueue[0].priorityReason}`
      : "I need synced assignments before I can prioritize your work.",
    intent,
    missingContext: context.missingContext,
    needsMoreContext: !context.priorityQueue.length,
    nextSteps: context.priorityQueue.slice(0, 3).map((item) => ({
      label: item.title,
      detail: `${item.priorityReason} Status: ${item.status}.`
    })),
    tutorQuestion: "Which assignment do you want to open for specific tutoring?"
  };
}

function getContextCitations(context: TutorContextPacket, reason: string) {
  const uniqueSources = new Map(
    [...context.sources, ...context.retrievedSources].map((source) => [source.title, source])
  );

  return [...uniqueSources.values()].slice(0, 4).map((source) => ({
    reason,
    title: source.title
  }));
}

function getMissingContext({
  hasAssignments,
  relatedFiles,
  selectedAssignment
}: {
  hasAssignments: boolean;
  relatedFiles: FileResource[];
  selectedAssignment?: Assignment | null;
}) {
  if (!selectedAssignment) {
    return hasAssignments ? [] : ["synced assignments"];
  }

  const missing = [];

  if (!relatedFiles.length) {
    missing.push("rubric or course material");
  }

  if (!selectedAssignment.description || selectedAssignment.description.length < 24) {
    missing.push("full assignment prompt");
  }

  return missing;
}

function mentionsAssignment(response: TutorResponse, assignmentTitle: string) {
  const haystack = [
    response.assignmentConnection,
    response.directAnswer,
    response.tutorQuestion,
    ...response.nextSteps.flatMap((step) => [step.label, step.detail])
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(assignmentTitle.toLowerCase());
}

function normalizeCitationList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const citation = item as { reason?: unknown; title?: unknown };

    return typeof citation.title === "string" && typeof citation.reason === "string"
      ? [{ reason: citation.reason.slice(0, 240), title: citation.title.slice(0, 160) }]
      : [];
  });
}

function normalizeSteps(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const step = item as { detail?: unknown; label?: unknown };

    return typeof step.label === "string" && typeof step.detail === "string"
      ? [{ detail: step.detail.slice(0, 360), label: step.label.slice(0, 80) }]
      : [];
  });
}

function normalizeStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 4) : [];
}

function isTutorIntent(value: unknown): value is TutorIntent {
  return (
    value === "check_attempt" ||
    value === "explain_prompt" ||
    value === "general" ||
    value === "priority" ||
    value === "quiz" ||
    value === "stuck_hint" ||
    value === "study_plan" ||
    value === "summarize_material"
  );
}
