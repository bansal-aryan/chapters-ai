import { LockedAssignmentsPage } from "@/components/locked-ui/assignments-page";
import { AppShell } from "@/components/layout/app-shell";
import { getLockedUiViewForCurrentUser } from "@/lib/locked-ui/view-model";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const liveView = await getLockedUiViewForCurrentUser();

  return (
    <AppShell>
      <LockedAssignmentsPage assignments={liveView?.assignmentRows} />
    </AppShell>
  );
}
