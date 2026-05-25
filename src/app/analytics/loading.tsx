import { AnalyticsSkeleton } from "@/components/analytics/analytics-skeleton";
import { AppShell } from "@/components/layout/app-shell";

export default function AnalyticsLoading() {
  return (
    <AppShell>
      <AnalyticsSkeleton />
    </AppShell>
  );
}
