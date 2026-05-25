import { LockedResourcesPage } from "@/components/locked-ui/resources-page";
import { AppShell } from "@/components/layout/app-shell";
import { getLockedUiViewForCurrentUser } from "@/lib/locked-ui/view-model";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const liveView = await getLockedUiViewForCurrentUser();

  return (
    <AppShell>
      <LockedResourcesPage files={liveView?.resourceFiles} folders={liveView?.resourceFolders} />
    </AppShell>
  );
}
