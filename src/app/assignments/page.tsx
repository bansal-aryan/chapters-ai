import { LockedAssignmentsPage } from "@/components/locked-ui/assignments-page";
import { AppShell } from "@/components/layout/app-shell";

export default function AssignmentsPage() {
  return (
    <AppShell>
      <LockedAssignmentsPage />
    </AppShell>
  );
}
