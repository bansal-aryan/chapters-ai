import { ArrowRight, Link2, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { completeOnboarding } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type OnboardingPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl content-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1fr)]">
        <section className="flex flex-col justify-center">
          <Link className="mb-12 flex items-center gap-3" href="/">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-foreground text-sm font-semibold text-background">
              C
            </div>
            <span className="text-sm font-semibold">chapters.ai</span>
          </Link>
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
            <Sparkles className="size-5" />
          </div>
          <h1 className="mt-7 max-w-xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            Set up the workspace around your school day.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            Tell chapters.ai the basics now and connect Canvas with a personal access token so your first sync can start immediately.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-muted-foreground">
            {[
              "Profile data stays scoped to your authenticated account.",
              "Canvas tokens are encrypted server-side before they are stored.",
              "For this MVP, Canvas personal access token connection is required."
            ].map((item) => (
              <div className="flex items-center gap-3" key={item}>
                <div className="flex size-7 items-center justify-center rounded-full bg-muted">
                  <ShieldCheck className="size-3.5" />
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <Card className="self-center border-border/80 bg-card/95 shadow-none">
          <CardHeader>
            <CardTitle>Onboarding</CardTitle>
            <CardDescription>One minute of context, then your dashboard opens.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={completeOnboarding} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Full name</span>
                  <Input defaultValue={user?.user_metadata.full_name ?? user?.email ?? ""} name="fullName" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Timezone</span>
                  <Input defaultValue="America/Los_Angeles" name="timezone" />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-medium text-muted-foreground">School</span>
                <Input name="schoolName" placeholder="Your school or university" />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Student level</span>
                <select
                  className="flex h-11 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  defaultValue="college"
                  name="studentLevel"
                >
                  <option value="college">College</option>
                  <option value="high_school">High school</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Canvas domain</span>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" name="canvasDomain" placeholder="school.instructure.com" required />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Canvas personal access token</span>
                <Input
                  autoComplete="off"
                  name="canvasAccessToken"
                  placeholder="Paste your Canvas token"
                  required
                  type="password"
                />
              </label>

              {params.error ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {params.error}
                </div>
              ) : null}

              <Button className="w-full" size="lg" type="submit">
                Connect Canvas and continue
                <ArrowRight />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
