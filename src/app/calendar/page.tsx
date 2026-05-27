import { LockedCalendarPage } from "@/components/locked-ui/calendar-page";
import { AppShell } from "@/components/layout/app-shell";
import { getLockedUiViewForCurrentUser } from "@/lib/locked-ui/view-model";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const liveView = await getLockedUiViewForCurrentUser();

  return (
    <AppShell>
      <LockedCalendarPage
        allDayEvents={liveView?.allDayEvents}
        calendarWeekStart={liveView?.calendarWeekStart}
        calendarEvents={liveView?.calendarEvents}
        monthLabel={liveView?.monthLabel}
        weekDays={liveView?.weekDays}
      />
    </AppShell>
  );
}
