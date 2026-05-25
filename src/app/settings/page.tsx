import { LockedSettingsPage, type CanvasStatus } from "@/components/locked-ui/settings-page";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthState } from "@/lib/supabase/auth-state";

type SettingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const authState = await getAuthState();
  const params = searchParams ? await searchParams : {};
  const initialCanvasStatus = getCanvasStatus(getFirstParam(params.canvas));

  return (
    <AppShell>
      <LockedSettingsPage
        canConnectCanvas={authState.hasRealUser}
        initialCanvasStatus={initialCanvasStatus}
        isDemoSession={authState.hasDemoSession}
      />
    </AppShell>
  );
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getCanvasStatus(status: string | undefined): CanvasStatus {
  switch (status) {
    case "connected":
    case "connection_error":
    case "invalid_domain":
    case "invalid_state":
    case "missing_code":
    case "missing_config":
    case "oauth_denied":
    case "token_exchange_failed":
      return status;
    default:
      return "idle";
  }
}
