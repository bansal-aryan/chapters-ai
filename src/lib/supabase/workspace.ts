import type { Assignment, Course, FileResource, ManualEvent, StudyBlock } from "@/types";
import type { Json } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type WorkspaceProfile = {
  id: string;
  fullName: string;
  schoolName: string;
  studentLevel: "high_school" | "college" | "other" | null;
  timezone: string;
};

export type StudentContext = {
  goals: string;
  learningPreferences: Record<string, unknown>;
  constraints: string;
  aiNotes: string;
};

export type CanvasConnection = {
  id: string;
  domain: string;
  status: "pending" | "connected" | "expired" | "revoked" | "error";
  scopes: string[];
  lastSyncedAt?: string;
};

export type WorkspaceSnapshot = {
  assignments: Assignment[];
  canvasConnections: CanvasConnection[];
  courses: Course[];
  files: FileResource[];
  manualEvents: ManualEvent[];
  profile: WorkspaceProfile | null;
  studyBlocks: StudyBlock[];
  studentContext: StudentContext | null;
};

type WorkspaceOptions = {
  allowEmpty?: boolean;
};

export async function getWorkspaceSnapshotFromSupabase(
  options: WorkspaceOptions = {}
): Promise<WorkspaceSnapshot | null> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const [
    profileResult,
    studentContextResult,
    canvasConnectionsResult,
    coursesResult,
    assignmentsResult,
    filesResult,
    assignmentFilesResult,
    assignmentRelationsResult,
    studyBlocksResult,
    manualEventsResult
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("student_contexts").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("canvas_connections").select("*").order("created_at", { ascending: false }),
    supabase.from("courses").select("*").order("created_at", { ascending: true }),
    supabase.from("assignments").select("*").order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("file_resources").select("*").order("created_at", { ascending: true }),
    supabase.from("assignment_file_resources").select("*"),
    supabase.from("assignment_relations").select("*").order("score", { ascending: false }),
    supabase.from("study_blocks").select("*").order("starts_at", { ascending: true }),
    supabase.from("manual_events").select("*").order("starts_at", { ascending: true })
  ]);

  if (
    profileResult.error ||
    studentContextResult.error ||
    canvasConnectionsResult.error ||
    coursesResult.error ||
    assignmentsResult.error ||
    filesResult.error ||
    assignmentFilesResult.error ||
    assignmentRelationsResult.error ||
    studyBlocksResult.error ||
    manualEventsResult.error
  ) {
    return null;
  }

  const courses = coursesResult.data.map<Course>((course) => ({
    id: course.id,
    source: course.source,
    name: course.name,
    code: course.code ?? "",
    term: course.term ?? "",
    color: course.color,
    canvasCourseId: course.canvas_course_id ?? undefined
  }));

  const fileIdsByAssignment = new Map<string, string[]>();
  assignmentFilesResult.data.forEach((item) => {
    fileIdsByAssignment.set(item.assignment_id, [
      ...(fileIdsByAssignment.get(item.assignment_id) ?? []),
      item.file_resource_id
    ]);
  });

  const relatedIdsByAssignment = new Map<string, string[]>();
  assignmentRelationsResult.data.forEach((item) => {
    relatedIdsByAssignment.set(item.assignment_id, [
      ...(relatedIdsByAssignment.get(item.assignment_id) ?? []),
      item.related_assignment_id
    ]);
  });

  const assignments = assignmentsResult.data.map<Assignment>((assignment) => ({
    id: assignment.id,
    source: assignment.source,
    courseId: assignment.course_id,
    title: assignment.title,
    description: assignment.description,
    summary: assignment.summary,
    dueDate: assignment.due_at ?? "",
    status: assignment.status,
    estimatedEffortMinutes: assignment.estimated_effort_minutes,
    priorityOverride: assignment.priority_override ?? undefined,
    relatedFileIds: fileIdsByAssignment.get(assignment.id) ?? [],
    relatedAssignmentIds: relatedIdsByAssignment.get(assignment.id) ?? [],
    lastSyncedAt: assignment.last_synced_at ?? undefined
  }));

  if (!options.allowEmpty && !courses.length && !assignments.length) {
    return null;
  }

  return {
    assignments,
    canvasConnections: canvasConnectionsResult.data.map<CanvasConnection>((connection) => ({
      id: connection.id,
      domain: connection.canvas_domain,
      status: connection.status,
      scopes: connection.scopes,
      lastSyncedAt: connection.last_synced_at ?? undefined
    })),
    courses,
    files: filesResult.data.map<FileResource>((file) => ({
      id: file.id,
      source: file.source,
      courseId: file.course_id,
      title: file.title,
      type: file.type,
      summary: file.summary,
      citation: file.citation,
      url: getFileResourceUrl(file.metadata, file.citation)
    })),
    manualEvents: manualEventsResult.data.map<ManualEvent>((event) => ({
      id: event.id,
      title: event.title,
      cadence: event.cadence ?? "Manual",
      startTime: event.starts_at,
      endTime: event.ends_at
    })),
    studyBlocks: studyBlocksResult.data
      .filter((block) => block.assignment_id)
      .map<StudyBlock>((block) => ({
        id: block.id,
        assignmentId: block.assignment_id as string,
        title: block.title,
        startTime: block.starts_at,
        endTime: block.ends_at,
        lockedByUser: block.locked_by_user,
        source: block.source
      })),
    profile: profileResult.data
      ? {
          id: profileResult.data.id,
          fullName: profileResult.data.full_name ?? user.email ?? "Student",
          schoolName: profileResult.data.school_name ?? "",
          studentLevel: profileResult.data.student_level,
          timezone: profileResult.data.timezone
        }
      : null,
    studentContext: studentContextResult.data
      ? {
          goals: studentContextResult.data.goals,
          learningPreferences:
            typeof studentContextResult.data.learning_preferences === "object" &&
            studentContextResult.data.learning_preferences !== null &&
            !Array.isArray(studentContextResult.data.learning_preferences)
              ? studentContextResult.data.learning_preferences
              : {},
          constraints: studentContextResult.data.constraints,
          aiNotes: studentContextResult.data.ai_notes
        }
      : null
  };
}

function getFileResourceUrl(metadata: Json, citation: string) {
  const metadataUrl = getMetadataString(metadata, ["url", "html_url", "external_url", "page_url", "canvas_url"]);

  if (metadataUrl) {
    return metadataUrl;
  }

  return isWebUrl(citation) ? citation : undefined;
}

function getMetadataString(metadata: Json, keys: string[]) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "string" && isWebUrl(value)) {
      return value;
    }
  }

  return undefined;
}

function isWebUrl(value: string) {
  return value.startsWith("https://") || value.startsWith("http://");
}
