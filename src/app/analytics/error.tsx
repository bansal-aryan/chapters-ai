"use client";

import { AlertTriangle, ArrowRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell>
      <main className="mx-auto grid max-w-3xl gap-6">
        <Card>
          <CardHeader>
            <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="size-5" />
            </div>
            <CardTitle>Analytics could not load</CardTitle>
            <CardDescription>
              The dashboard kept the rest of your workspace safe, but this view could not finish building its analytics snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={reset} type="button">
              <RotateCcw />
              Try again
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard">
                Return to dashboard
                <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
