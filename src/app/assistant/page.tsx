import { LockedAssistantPage } from "@/components/locked-ui/assistant-page";
import { AppShell } from "@/components/layout/app-shell";
import { getLockedUiViewForCurrentUser } from "@/lib/locked-ui/view-model";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const liveView = await getLockedUiViewForCurrentUser();

  return (
    <AppShell>
      <LockedAssistantPage userName={liveView?.firstName} />
    </AppShell>
  );
}
