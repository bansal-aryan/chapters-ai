import { LockedDashboardPage } from "@/components/locked-ui/dashboard-page";
import { AppShell } from "@/components/layout/app-shell";

export default function DashboardPage() {
  return (
    <AppShell>
      <LockedDashboardPage />
    </AppShell>
  );
}
