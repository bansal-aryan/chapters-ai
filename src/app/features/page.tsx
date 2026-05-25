import { MarketingDetailPage } from "@/components/marketing/marketing-detail-page";
import { getIsAuthenticated } from "@/lib/supabase/auth-state";

export const dynamic = "force-dynamic";

export default async function FeaturesPage() {
  return <MarketingDetailPage isAuthenticated={await getIsAuthenticated()} kind="features" />;
}
