import { ArrowRight, BookOpen, PlugZap, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AnalyticsEmptyState() {
  return (
    <main className="mx-auto grid max-w-5xl gap-6">
      <section className="rounded-3xl border border-border bg-card p-6 md:p-10">
        <Badge variant="secondary">
          <Sparkles className="size-3" />
          Analytics
        </Badge>
        <h1 className="mt-5 max-w-3xl text-balance text-3xl font-semibold tracking-tight md:text-5xl">
          Your school workload will appear here once classes are connected.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
          Connect Canvas or add a class manually to unlock risk scoring, workload forecasts, material coverage, and AI study recommendations.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/onboarding">
              Start onboarding
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/settings">
              <PlugZap />
              Connect Canvas
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: BookOpen,
            title: "Classes",
            body: "Course names, terms, and color labels set the structure for analytics."
          },
          {
            icon: PlugZap,
            title: "Assignments",
            body: "Due dates, status, and effort estimates power priority and risk scoring."
          },
          {
            icon: Sparkles,
            title: "Materials",
            body: "Files and modules help AI explain recommendations with course context."
          }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.title}>
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.body}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
