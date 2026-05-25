import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  return (
    <AuthPageShell
      heading="Return to the workspace that keeps school moving."
      subheading="Sign in to see your assignments, course materials, schedule, and AI study assistant in one calm place."
    >
      <Suspense fallback={<Skeleton className="h-[520px] rounded-2xl" />}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthPageShell>
  );
}
