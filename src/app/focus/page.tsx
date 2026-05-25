import { LockedFocusPage } from "@/components/locked-ui/focus-page";
import { AppShell } from "@/components/layout/app-shell";
import { getLockedUiViewForCurrentUser } from "@/lib/locked-ui/view-model";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  const liveView = await getLockedUiViewForCurrentUser();

  return (
    <AppShell>
      <LockedFocusPage
        bars={liveView?.focusBars}
        sessions={liveView?.focusSessions}
        totalFocusTime={liveView?.totalFocusTime}
      />
    </AppShell>
  );
}
