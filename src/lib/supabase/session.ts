import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthenticatedSupabase = {
  supabase: SupabaseClient<Database>;
  user: User;
};

export async function getAuthenticatedSupabase(): Promise<
  | AuthenticatedSupabase
  | {
      error: NextResponse;
    }
> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      error: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 })
    };
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Authentication required." }, { status: 401 })
    };
  }

  return { supabase, user };
}

export function isAuthResult(
  result: Awaited<ReturnType<typeof getAuthenticatedSupabase>>
): result is AuthenticatedSupabase {
  return "supabase" in result;
}
