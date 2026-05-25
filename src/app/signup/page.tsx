import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function SignupPage() {
  return (
    <AuthPageShell
      heading="Start with your account. Bring Canvas next."
      subheading="Create a chapters.ai workspace, then connect your Canvas domain so assignments, files, modules, and due dates can become one prioritized plan."
    >
      <Suspense fallback={<Skeleton className="h-[580px] rounded-2xl" />}>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthPageShell>
  );
}
