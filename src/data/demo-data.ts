import type {
  Assignment,
  ChatMessage,
  Course,
  FileResource,
  ManualEvent,
  StudyBlock
} from "@/types";

export const courses: Course[] = [
  {
    id: "bio-201",
    source: "canvas",
    name: "Biology",
    code: "BIO 201",
    term: "Spring",
    color: "#2f7d68",
    canvasCourseId: "83721"
  },
  {
    id: "hist-110",
    source: "canvas",
    name: "Modern History",
    code: "HIST 110",
    term: "Spring",
    color: "#9b5c2f",
    canvasCourseId: "83752"
  },
  {
    id: "calc-101",
    source: "manual",
    name: "Calculus",
    code: "MATH 101",
    term: "Spring",
    color: "#3f5f9d"
  }
];

export const assignments: Assignment[] = [
  {
    id: "bio-lab-report",
    source: "canvas",
    courseId: "bio-201",
    title: "Photosynthesis Lab Report",
    description:
      "Analyze pigment chromatography results and explain how light wavelength affected reaction rate.",
    summary:
      "Write a lab report connecting chromatography evidence to photosynthesis efficiency and reaction rate.",
    dueDate: "2026-05-24T23:59:00-07:00",
    status: "in_progress",
    estimatedEffortMinutes: 150,
    relatedFileIds: ["bio-lab-rubric", "bio-pigments-pdf"],
    relatedAssignmentIds: ["bio-quiz-enzymes"],
    lastSyncedAt: "2026-05-21T17:00:00-07:00"
  },
  {
    id: "history-essay",
    source: "canvas",
    courseId: "hist-110",
    title: "Cold War Source Analysis",
    description:
      "Compare two primary sources and argue how each reflects containment policy.",
    summary:
      "Build a thesis-driven source analysis using two Cold War documents and course lecture notes.",
    dueDate: "2026-05-25T21:00:00-07:00",
    status: "not_started",
    estimatedEffortMinutes: 210,
    relatedFileIds: ["history-primary-sources"],
    relatedAssignmentIds: [],
    lastSyncedAt: "2026-05-21T17:00:00-07:00"
  },
  {
    id: "calc-problem-set",
    source: "manual",
    courseId: "calc-101",
    title: "Optimization Problem Set",
    description:
      "Complete problems 14-28 and write out reasoning for application problems.",
    summary:
      "Practice derivatives in real-world optimization scenarios with full written explanations.",
    dueDate: "2026-05-23T18:00:00-07:00",
    status: "not_started",
    estimatedEffortMinutes: 120,
    relatedFileIds: ["calc-derivatives-notes"],
    relatedAssignmentIds: [],
    priorityOverride: 1
  },
  {
    id: "bio-quiz-enzymes",
    source: "canvas",
    courseId: "bio-201",
    title: "Enzyme Kinetics Quiz",
    description:
      "Short quiz covering enzyme activity, activation energy, and graph interpretation.",
    summary:
      "Review enzyme kinetics vocabulary and practice reading reaction-rate graphs.",
    dueDate: "2026-05-22T10:30:00-07:00",
    status: "missing",
    estimatedEffortMinutes: 45,
    relatedFileIds: ["bio-enzymes-slides"],
    relatedAssignmentIds: [],
    lastSyncedAt: "2026-05-21T17:00:00-07:00"
  }
];

export const files: FileResource[] = [
  {
    id: "bio-lab-rubric",
    source: "canvas",
    courseId: "bio-201",
    title: "Lab Report Rubric",
    type: "pdf",
    summary:
      "Rubric emphasizes claim-evidence-reasoning, figures, and discussion of experimental error.",
    citation: "Biology > Modules > Lab 4 > Lab Report Rubric"
  },
  {
    id: "bio-pigments-pdf",
    source: "canvas",
    courseId: "bio-201",
    title: "Plant Pigments Reading",
    type: "pdf",
    summary:
      "Explains chlorophyll absorption, carotenoids, and why pigments separate during chromatography.",
    citation: "Biology > Files > plant-pigments.pdf"
  },
  {
    id: "history-primary-sources",
    source: "canvas",
    courseId: "hist-110",
    title: "Cold War Primary Source Packet",
    type: "doc",
    summary:
      "Contains Truman Doctrine excerpts, NSC-68 selections, and guiding analysis questions.",
    citation: "Modern History > Week 8 Module > Source Packet"
  },
  {
    id: "calc-derivatives-notes",
    source: "manual",
    courseId: "calc-101",
    title: "Derivative Rules Notes",
    type: "image",
    summary:
      "Photo of class notes covering product rule, quotient rule, and first-derivative test.",
    citation: "Manual upload > Derivative Rules Notes"
  },
  {
    id: "bio-enzymes-slides",
    source: "canvas",
    courseId: "bio-201",
    title: "Enzyme Kinetics Slides",
    type: "pdf",
    summary:
      "Slides define activation energy, substrates, inhibitors, and reaction-rate graph patterns.",
    citation: "Biology > Module 6 > Enzyme Kinetics"
  }
];

export const studyBlocks: StudyBlock[] = [
  {
    id: "block-calc",
    assignmentId: "calc-problem-set",
    title: "Work through optimization setup problems",
    startTime: "2026-05-22T16:00:00-07:00",
    endTime: "2026-05-22T17:30:00-07:00",
    lockedByUser: false,
    source: "ai"
  },
  {
    id: "block-bio",
    assignmentId: "bio-lab-report",
    title: "Draft Bio lab discussion",
    startTime: "2026-05-22T19:00:00-07:00",
    endTime: "2026-05-22T20:30:00-07:00",
    lockedByUser: false,
    source: "ai"
  }
];

export const manualEvents: ManualEvent[] = [
  {
    id: "soccer",
    title: "Soccer practice",
    cadence: "Tue and Thu",
    startTime: "2026-05-21T18:00:00-07:00",
    endTime: "2026-05-21T19:30:00-07:00"
  }
];

export const chatMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    scope: "global",
    content:
      "You have one missing quiz, one manual calculus set due soon, and two larger writing tasks. I put the quiz review first, then the calculus set because it is closer and still substantial."
  }
];
