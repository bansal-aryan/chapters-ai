import { NextResponse } from "next/server";
import { buildStudyBlocks } from "@/lib/domain/study-plan";
import { getWorkspaceSnapshotFromSupabase } from "@/lib/supabase/workspace";
import { getAuthenticatedSupabase, isAuthResult } from "@/lib/supabase/session";

export async function POST() {
  const auth = await getAuthenticatedSupabase();

  if (!isAuthResult(auth)) {
    return auth.error;
  }

  const snapshot = await getWorkspaceSnapshotFromSupabase({ allowEmpty: true });
  const plannedBlocks = buildStudyBlocks({
    assignments: snapshot?.assignments ?? [],
    manualEvents: snapshot?.manualEvents ?? []
  });

  if (!plannedBlocks.length) {
    return NextResponse.json({ blocks: [] });
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

  return NextResponse.json({ blocks: data });
}
