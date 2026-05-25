import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { AppShell } from "@/components/layout/app-shell";
import * as demoData from "@/data/demo-data";
import { getWorkspaceSnapshotFromSupabase } from "@/lib/supabase/workspace";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const snapshot = await getWorkspaceSnapshotFromSupabase();

  return (
    <AppShell>
      <AnalyticsDashboard
        assignments={snapshot?.assignments ?? demoData.assignments}
        courses={snapshot?.courses ?? demoData.courses}
        files={snapshot?.files ?? demoData.files}
        manualEvents={snapshot?.manualEvents ?? demoData.manualEvents}
        studyBlocks={snapshot?.studyBlocks ?? demoData.studyBlocks}
      />
    </AppShell>
  );
}
