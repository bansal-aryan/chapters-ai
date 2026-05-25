import { LockedDashboardPage } from "@/components/locked-ui/dashboard-page";
import { AppShell } from "@/components/layout/app-shell";
import { getLockedUiViewForCurrentUser } from "@/lib/locked-ui/view-model";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const liveView = await getLockedUiViewForCurrentUser();

  return (
    <AppShell>
      <LockedDashboardPage
        assistantSuggestion={liveView?.assistantSuggestion}
        assignments={liveView?.assignmentRows}
        calendarEvents={liveView?.calendarEvents}
        dashboardCards={liveView?.dashboardCards}
        dashboardFocus={liveView?.dashboardFocus}
        resourceFiles={liveView?.resourceFiles}
        userName={liveView?.firstName}
      />
    </AppShell>
  );
}
