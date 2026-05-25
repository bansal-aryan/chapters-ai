import { LockedAssistantPage } from "@/components/locked-ui/assistant-page";
import { AppShell } from "@/components/layout/app-shell";

export default function AssistantPage() {
  return (
    <AppShell>
      <LockedAssistantPage />
    </AppShell>
  );
}
