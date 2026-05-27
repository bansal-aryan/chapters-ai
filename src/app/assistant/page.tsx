import { LockedAssistantPage } from "@/components/locked-ui/assistant-page";
import { AppShell } from "@/components/layout/app-shell";
import * as demoData from "@/data/demo-data";
import { mapAssistantThreadSummary } from "@/lib/ai/chat-history";
import { getLockedUiViewForCurrentUser } from "@/lib/locked-ui/view-model";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWorkspaceSnapshotFromSupabase, type WorkspaceSnapshot } from "@/lib/supabase/workspace";

export const dynamic = "force-dynamic";

type AssistantPageProps = {
  searchParams: Promise<{
    assignmentId?: string;
    courseId?: string;
  }>;
};

export default async function AssistantPage({ searchParams }: AssistantPageProps) {
  const [{ assignmentId, courseId }, liveView, snapshot] = await Promise.all([
    searchParams,
    getLockedUiViewForCurrentUser(),
    getWorkspaceSnapshotFromSupabase({ allowEmpty: true })
  ]);
  const context = buildAssistantContext({ assignmentId, courseId, snapshot });
  const initialThreads = await getInitialAssistantThreads(snapshot);

  return (
    <AppShell>
      <LockedAssistantPage context={context} initialThreads={initialThreads} userName={liveView?.firstName} />
    </AppShell>
  );
}

async function getInitialAssistantThreads(snapshot: WorkspaceSnapshot | null) {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return [];
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from("chat_threads")
    .select("id, title, scope, course_id, assignment_id, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error || !data) {
    return [];
  }

  return data.map((thread) => mapAssistantThreadSummary(thread, snapshot));
}

function buildAssistantContext({
  assignmentId,
  courseId,
  snapshot
}: {
  assignmentId?: string;
  courseId?: string;
  snapshot: WorkspaceSnapshot | null;
}) {
  const assignments = snapshot?.assignments.length ? snapshot.assignments : demoData.assignments;
  const courses = snapshot?.courses.length ? snapshot.courses : demoData.courses;
  const files = snapshot?.files.length ? snapshot.files : demoData.files;
  const assignment = assignmentId ? assignments.find((item) => item.id === assignmentId) : null;
  const course = assignment
    ? courses.find((item) => item.id === assignment.courseId)
    : courseId
      ? courses.find((item) => item.id === courseId)
      : null;

  if (assignment) {
    const relatedFiles = files.filter((file) => assignment.relatedFileIds.includes(file.id));

    return {
      assignmentId: assignment.id,
      courseId: assignment.courseId,
      sourceTitles: relatedFiles.map((file) => file.title).slice(0, 3),
      starterPrompts: [
        `Break down the exact prompt for ${assignment.title}`,
        `Make a 45-minute plan for ${assignment.title}`,
        `Quiz me one question at a time on ${assignment.title}`
      ],
      subtitle: course ? `${course.name} - ${assignment.status.replaceAll("_", " ")}` : assignment.status.replaceAll("_", " "),
      title: assignment.title,
      type: "assignment" as const
    };
  }

  if (course) {
    return {
      courseId: course.id,
      sourceTitles: files
        .filter((file) => file.courseId === course.id)
        .map((file) => file.title)
        .slice(0, 3),
      starterPrompts: [
        `What should I review next for ${course.name}?`,
        `Quiz me one question at a time on recent ${course.name} material`,
        `Summarize my highest-priority ${course.name} assignment`
      ],
      subtitle: [course.code, course.term].filter(Boolean).join(" - "),
      title: course.name,
      type: "class" as const
    };
  }

  return {
    sourceTitles: [],
    starterPrompts: [
      "What should I study first today?",
      "Build a 45-minute plan from my priorities",
      "Quiz me on my highest priority assignment"
    ],
    subtitle: "Uses your assignments, schedule, files, and previous coursework.",
    title: "Workspace assistant",
    type: "global" as const
  };
}
