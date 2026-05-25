import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthState = {
  hasDemoSession: boolean;
  hasRealUser: boolean;
  isAuthenticated: boolean;
};

export async function getAuthState(): Promise<AuthState> {
  const cookieStore = await cookies();
  const hasDemoSession = cookieStore.get("chapters_demo_session")?.value === "1";
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      hasDemoSession,
      hasRealUser: false,
      isAuthenticated: hasDemoSession
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  const hasRealUser = Boolean(user);

  return {
    hasDemoSession,
    hasRealUser,
    isAuthenticated: hasDemoSession || hasRealUser
  };
}

export async function getIsAuthenticated(): Promise<boolean> {
  const authState = await getAuthState();
  return authState.isAuthenticated;
}
