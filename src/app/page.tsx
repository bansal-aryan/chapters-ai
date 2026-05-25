import { LandingPage } from "@/components/marketing/landing-page";
import { getIsAuthenticated } from "@/lib/supabase/auth-state";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return <LandingPage isAuthenticated={await getIsAuthenticated()} />;
}
