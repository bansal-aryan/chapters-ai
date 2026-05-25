import { LockedResourcesPage } from "@/components/locked-ui/resources-page";
import { AppShell } from "@/components/layout/app-shell";

export default function ResourcesPage() {
  return (
    <AppShell>
      <LockedResourcesPage />
    </AppShell>
  );
}
