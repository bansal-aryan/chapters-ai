import type { Json } from "@/lib/supabase/database.types";

export type CanvasCourse = {
  course_code?: unknown;
  end_at?: unknown;
  id?: unknown;
  name?: unknown;
  start_at?: unknown;
  term?: {
    name?: unknown;
  };
  workflow_state?: unknown;
};

export type CanvasAssignment = {
  all_dates?: unknown;
  created_at?: unknown;
  description?: unknown;
  due_at?: unknown;
  html_url?: unknown;
  id?: unknown;
  lock_at?: unknown;
  name?: unknown;
  points_possible?: unknown;
  submission?: {
    graded_at?: unknown;
    late?: unknown;
    missing?: unknown;
    score?: unknown;
    submitted_at?: unknown;
    workflow_state?: unknown;
  };
  submission_types?: unknown;
  unlock_at?: unknown;
  updated_at?: unknown;
  workflow_state?: unknown;
};

export type CanvasFile = {
  content_type?: unknown;
  display_name?: unknown;
  filename?: unknown;
  id?: unknown;
  size?: unknown;
  updated_at?: unknown;
  url?: unknown;
};

export type CanvasModule = {
  id?: unknown;
  items?: CanvasModuleItem[];
  name?: unknown;
  workflow_state?: unknown;
};

export type CanvasModuleItem = {
  content_id?: unknown;
  external_url?: unknown;
  html_url?: unknown;
  id?: unknown;
  page_url?: unknown;
  title?: unknown;
  type?: unknown;
  url?: unknown;
};

export type CourseInsert = {
  canvas_course_id: string;
  code: string | null;
  color: string;
  last_synced_at: string;
  name: string;
  source: "canvas";
  term: string | null;
  user_id: string;
};

export type AssignmentInsert = {
  canvas_assignment_id: string;
  course_id: string;
  description: string;
  due_at: string | null;
  estimated_effort_minutes: number;
  last_synced_at: string;
  metadata: Json;
  source: "canvas";
  status: "not_started" | "in_progress" | "submitted" | "graded" | "missing";
  summary: string;
  title: string;
  user_id: string;
};

export type FileResourceInsert = {
  canvas_file_id: string;
  citation: string;
  course_id: string;
  metadata: Json;
  source: "canvas";
  storage_path: string | null;
  summary: string;
  title: string;
  type: "pdf" | "doc" | "image" | "link";
  user_id: string;
};

export type SearchChunkInsert = {
  assignment_id?: string | null;
  citation: string;
  content: string;
  course_id?: string | null;
  file_resource_id?: string | null;
  metadata: Json;
  source_type: "assignment" | "file" | "module" | "note";
  summary: string;
  title: string;
  user_id: string;
};

const courseColors = ["#6d3df2", "#2563eb", "#0891b2", "#16a34a", "#ca8a04", "#db2777", "#475569"];

export function getCanvasId(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

export function normalizeCourseInsert({
  course,
  syncedAt,
  userId
}: {
  course: CanvasCourse;
  syncedAt: string;
  userId: string;
}): CourseInsert | null {
  const id = getCanvasId(course.id);
  const name = asText(course.name);

  if (!id || !name) {
    return null;
  }

  return {
    canvas_course_id: id,
    code: asText(course.course_code),
    color: courseColors[hashString(id) % courseColors.length],
    last_synced_at: syncedAt,
    name,
    source: "canvas",
    term: asText(course.term?.name),
    user_id: userId
  };
}

export function normalizeAssignmentInsert({
  assignment,
  canvasCourseId,
  canvasDomain,
  courseId,
  syncedAt,
  userId
}: {
  assignment: CanvasAssignment;
  canvasCourseId: string;
  canvasDomain: string;
  courseId: string;
  syncedAt: string;
  userId: string;
}): AssignmentInsert | null {
  const id = getCanvasId(assignment.id);
  const title = asText(assignment.name);

  if (!id || !title) {
    return null;
  }

  const description = stripHtml(asText(assignment.description) ?? "");
  const summary = summarizeText(description, "No Canvas description yet.");
  const dueAt = asText(assignment.due_at);

  return {
    canvas_assignment_id: id,
    course_id: courseId,
    description,
    due_at: dueAt,
    estimated_effort_minutes: estimateEffortMinutes(description, assignment.points_possible),
    last_synced_at: syncedAt,
    metadata: compactJson({
      all_dates: assignment.all_dates,
      canvas_course_id: canvasCourseId,
      canvas_domain: canvasDomain,
      created_at: assignment.created_at,
      html_url: assignment.html_url,
      lock_at: assignment.lock_at,
      points_possible: assignment.points_possible,
      source: "canvas",
      submission: assignment.submission,
      submission_types: assignment.submission_types,
      unlock_at: assignment.unlock_at,
      updated_at: assignment.updated_at,
      workflow_state: assignment.workflow_state
    }),
    source: "canvas",
    status: getAssignmentStatus(assignment, dueAt),
    summary,
    title,
    user_id: userId
  };
}

export function normalizeFileResourceInsert({
  canvasCourseId,
  canvasDomain,
  courseId,
  file,
  userId
}: {
  canvasCourseId: string;
  canvasDomain: string;
  courseId: string;
  file: CanvasFile;
  userId: string;
}): FileResourceInsert | null {
  const id = getCanvasId(file.id);
  const title = asText(file.display_name) ?? asText(file.filename);

  if (!id || !title) {
    return null;
  }

  return {
    canvas_file_id: `${canvasCourseId}:file:${id}`,
    citation: `Canvas > ${canvasCourseId} > Files > ${title}`,
    course_id: courseId,
    metadata: compactJson({
      canvas_course_id: canvasCourseId,
      canvas_domain: canvasDomain,
      content_type: file.content_type,
      size: file.size,
      source: "canvas",
      updated_at: file.updated_at,
      url: file.url
    }),
    source: "canvas",
    storage_path: null,
    summary: summarizeText(title, title),
    title,
    type: getFileType(title, asText(file.content_type)),
    user_id: userId
  };
}

export function normalizeModuleResourceInsert({
  canvasCourseId,
  canvasDomain,
  courseId,
  item,
  module,
  userId
}: {
  canvasCourseId: string;
  canvasDomain: string;
  courseId: string;
  item: CanvasModuleItem;
  module: CanvasModule;
  userId: string;
}): FileResourceInsert | null {
  const moduleId = getCanvasId(module.id);
  const itemId = getCanvasId(item.id);
  const title = asText(item.title);

  if (!moduleId || !itemId || !title) {
    return null;
  }

  const itemType = asText(item.type) ?? "ModuleItem";

  return {
    canvas_file_id: `${canvasCourseId}:module:${moduleId}:item:${itemId}`,
    citation: `Canvas > ${canvasCourseId} > ${asText(module.name) ?? "Module"} > ${title}`,
    course_id: courseId,
    metadata: compactJson({
      canvas_course_id: canvasCourseId,
      canvas_domain: canvasDomain,
      content_id: item.content_id,
      external_url: item.external_url,
      html_url: item.html_url,
      item_type: itemType,
      module_id: moduleId,
      module_name: module.name,
      page_url: item.page_url,
      source: "canvas",
      url: item.url
    }),
    source: "canvas",
    storage_path: null,
    summary: `${itemType} from ${asText(module.name) ?? "Canvas module"}`,
    title,
    type: itemType === "File" ? getFileType(title) : "link",
    user_id: userId
  };
}

export function createAssignmentSearchChunk({
  assignment,
  assignmentId,
  canvasDomain,
  courseId,
  userId
}: {
  assignment: AssignmentInsert;
  assignmentId: string;
  canvasDomain: string;
  courseId: string;
  userId: string;
}): SearchChunkInsert | null {
  const content = [assignment.title, assignment.summary, assignment.description].filter(Boolean).join("\n\n");

  if (!content.trim()) {
    return null;
  }

  return {
    assignment_id: assignmentId,
    citation: assignment.title,
    content,
    course_id: courseId,
    metadata: compactJson({
      canvas_assignment_id: assignment.canvas_assignment_id,
      canvas_domain: canvasDomain,
      source: "canvas"
    }),
    source_type: "assignment",
    summary: assignment.summary,
    title: assignment.title,
    user_id: userId
  };
}

export function createResourceSearchChunk({
  canvasDomain,
  courseId,
  resource,
  resourceId,
  userId
}: {
  canvasDomain: string;
  courseId: string;
  resource: FileResourceInsert;
  resourceId: string;
  userId: string;
}): SearchChunkInsert {
  return {
    citation: resource.citation,
    content: [resource.title, resource.summary, resource.citation].filter(Boolean).join("\n\n"),
    course_id: courseId,
    file_resource_id: resourceId,
    metadata: compactJson({
      canvas_domain: canvasDomain,
      canvas_file_id: resource.canvas_file_id,
      source: "canvas"
    }),
    source_type: resource.canvas_file_id.includes(":module:") ? "module" : "file",
    summary: resource.summary,
    title: resource.title,
    user_id: userId
  };
}

function getAssignmentStatus(assignment: CanvasAssignment, dueAt: string | null): AssignmentInsert["status"] {
  const submission = assignment.submission;
  const workflowState = asText(submission?.workflow_state);

  if (workflowState === "graded" || submission?.graded_at) {
    return "graded";
  }

  if (submission?.missing === true) {
    return "missing";
  }

  if (workflowState === "submitted" || workflowState === "pending_review" || submission?.submitted_at) {
    return "submitted";
  }

  if (dueAt && new Date(dueAt).getTime() < Date.now()) {
    return "missing";
  }

  return "not_started";
}

function estimateEffortMinutes(description: string, points: unknown) {
  const pointValue = typeof points === "number" && Number.isFinite(points) ? points : 0;
  const readingMinutes = Math.ceil(description.split(/\s+/).filter(Boolean).length / 180) * 10;
  const pointMinutes = pointValue > 0 ? Math.min(120, Math.ceil(pointValue / 10) * 15) : 0;

  return Math.max(30, Math.min(180, readingMinutes + pointMinutes || 45));
}

function getFileType(title: string, contentType?: string | null): FileResourceInsert["type"] {
  const value = `${title} ${contentType ?? ""}`.toLowerCase();

  if (value.includes("pdf") || value.endsWith(".pdf")) {
    return "pdf";
  }

  if (value.includes("image") || /\.(png|jpe?g|gif|webp|svg)\b/.test(value)) {
    return "image";
  }

  if (/\.(docx?|pptx?|xlsx?)\b/.test(value) || value.includes("word") || value.includes("document")) {
    return "doc";
  }

  return "link";
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeText(value: string, fallback: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.length > 240 ? `${normalized.slice(0, 237).trim()}...` : normalized;
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function compactJson(value: Record<string, unknown>): Json {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== null && entry !== undefined)
      .map(([key, entry]) => [key, normalizeJson(entry)])
  ) as Json;
}

function normalizeJson(value: unknown): Json {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeJson);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, normalizeJson(entry)])
    ) as Json;
  }

  return String(value);
}

function hashString(value: string) {
  return value.split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
}
