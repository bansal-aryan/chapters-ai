import { LockedSettingsPage, type CanvasStatus } from "@/components/locked-ui/settings-page";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthState } from "@/lib/supabase/auth-state";
import { getWorkspaceSnapshotFromSupabase } from "@/lib/supabase/workspace";

type SettingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const authState = await getAuthState();
  const snapshot = authState.hasRealUser ? await getWorkspaceSnapshotFromSupabase({ allowEmpty: true }) : null;
  const canvasConnection = snapshot?.canvasConnections[0];
  const params = searchParams ? await searchParams : {};
  const initialCanvasStatus = getCanvasStatus(getFirstParam(params.canvas), canvasConnection?.status);

  return (
    <AppShell>
      <LockedSettingsPage
        canConnectCanvas={authState.hasRealUser}
        connectedCanvasDomain={canvasConnection?.domain}
        initialCanvasStatus={initialCanvasStatus}
        isDemoSession={authState.hasDemoSession}
        lastSyncedAt={canvasConnection?.lastSyncedAt}
      />
    </AppShell>
  );
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getCanvasStatus(status: string | undefined, storedStatus?: string): CanvasStatus {
  switch (status) {
    case "connected":
    case "connection_error":
    case "invalid_domain":
    case "invalid_state":
    case "missing_config":
    case "token_exchange_failed":
      return status;
    default:
      if (storedStatus === "connected") {
        return "connected";
      }

      if (storedStatus === "expired" || storedStatus === "error") {
        return "connection_error";
      }

      return "idle";
  }
}
