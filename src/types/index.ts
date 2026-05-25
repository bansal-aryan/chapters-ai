export type DataSource = "canvas" | "manual";

export type AssignmentStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "graded"
  | "missing";

export type Course = {
  id: string;
  source: DataSource;
  name: string;
  code: string;
  term: string;
  color: string;
  canvasCourseId?: string;
};

export type Assignment = {
  id: string;
  source: DataSource;
  courseId: string;
  title: string;
  description: string;
  summary: string;
  dueDate: string;
  status: AssignmentStatus;
  estimatedEffortMinutes: number;
  priorityOverride?: number;
  relatedFileIds: string[];
  relatedAssignmentIds: string[];
  lastSyncedAt?: string;
};

export type FileResource = {
  id: string;
  source: DataSource;
  courseId: string;
  title: string;
  type: "pdf" | "doc" | "image" | "link";
  summary: string;
  citation: string;
};

export type StudyBlock = {
  id: string;
  assignmentId: string;
  title: string;
  startTime: string;
  endTime: string;
  lockedByUser: boolean;
  source: "ai" | "manual";
};

export type ManualEvent = {
  id: string;
  title: string;
  cadence: string;
  startTime: string;
  endTime: string;
};

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  scope: "global" | "class";
  citationIds?: string[];
};

export type SearchResult = {
  id: string;
  title: string;
  courseId?: string;
  assignmentId?: string;
  fileResourceId?: string;
  sourceType: "assignment" | "file" | "module" | "note";
  summary: string;
  citation: string;
  relevance: number;
};
