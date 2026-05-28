import { NextResponse } from "next/server";
import { buildStudyBlocks, getCatchUpStudyWindow } from "@/lib/domain/study-plan";
import { getWorkspaceSnapshotFromSupabase } from "@/lib/supabase/workspace";
import { getAuthenticatedSupabase, isAuthResult } from "@/lib/supabase/session";

export async function POST() {
  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    return auth.error;
  }

  const snapshot = await getWorkspaceSnapshotFromSupabase({ allowEmpty: true });
  const now = new Date();
  const timezone = snapshot?.profile?.timezone || "America/Los_Angeles";
  const studyWindow = getCatchUpStudyWindow(now, timezone);
  const plannedBlocks = buildStudyBlocks({
    assignments: snapshot?.assignments ?? [],
    manualEvents: snapshot?.manualEvents ?? [],
    now,
    studyBlocks: snapshot?.studyBlocks ?? [],
    timezone
  });

  const { error: deleteError } = await auth.supabase
    .from("study_blocks")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("source", "ai")
    .eq("locked_by_user", false)
    .gte("starts_at", studyWindow.dayStart.toISOString())
    .lt("starts_at", studyWindow.dayEnd.toISOString());

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  if (!plannedBlocks.length) {
    return NextResponse.json({
      blocks: [],
      window: formatStudyWindow(studyWindow)
    });
  }

  const { data, error } = await auth.supabase
    .from("study_blocks")
    .insert(
      plannedBlocks.map((block) => ({
        user_id: auth.user.id,
        assignment_id: block.assignmentId,
        title: block.title,
        starts_at: block.startTime,
        ends_at: block.endTime,
        locked_by_user: block.lockedByUser,
        source: block.source
      }))
    )
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    blocks: data,
    window: formatStudyWindow(studyWindow)
  });
}

function formatStudyWindow(window: ReturnType<typeof getCatchUpStudyWindow>) {
  return {
    dayEnd: window.dayEnd.toISOString(),
    dayStart: window.dayStart.toISOString(),
    end: window.end.toISOString(),
    isSchoolDay: window.isSchoolDay,
    maxFocusMinutes: window.maxFocusMinutes,
    start: window.start.toISOString(),
    timezone: window.timezone
  };
}
