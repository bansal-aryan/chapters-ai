"use client";

import { ArrowRight, Globe2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

function getSafeNext(value: string | null, fallback: string) {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return fallback;
}

function isEmailRateLimitError(error: { code?: string; message?: string; status?: number }) {
  const message = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();

  return error.status === 429 || (message.includes("email") && (message.includes("rate") || message.includes("too many")));
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = searchParams.get("error");
  const next = useMemo(
    () => getSafeNext(searchParams.get("next"), mode === "signup" ? "/onboarding" : "/dashboard"),
    [mode, searchParams]
  );
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState<"email" | "google" | null>(null);
  const isSignup = mode === "signup";
  const isDemoModeEnabled = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true";

  function getAuthClient(): SupabaseClient<Database> | null {
    try {
      return createBrowserSupabaseClient();
    } catch {
      setError("Signup is not configured yet. Add the Supabase URL and publishable key, then refresh this page.");
      setLoading(null);
      return null;
    }
  }

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading("email");

    const supabase = getAuthClient();

    if (!supabase) {
      return;
    }

    if (isSignup) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding`
        }
      });

      if (signUpError) {
        if (isEmailRateLimitError(signUpError)) {
          setError(
            "Email signup is temporarily rate-limited by Supabase. Continue in demo mode for the prototype, use Google sign-in, or try again after the email limit resets."
          );
        } else {
          setError(signUpError.message);
        }
        setLoading(null);
        return;
      }

      if (data.session) {
        router.push("/onboarding");
        router.refresh();
        return;
      }

      setNotice("Check your email to confirm your account, then you will continue to onboarding.");
      setLoading(null);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(null);
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function handleGoogleAuth() {
    setError(null);
    setNotice(null);
    setLoading("google");

    const supabase = getAuthClient();

    if (!supabase) {
      return;
    }
    const redirectNext = isSignup ? "/onboarding" : next;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectNext)}`
      }
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(null);
    }
  }

  return (
    <Card className="w-full border-border/80 bg-card/95 shadow-none">
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl">{isSignup ? "Create your workspace" : "Welcome back"}</CardTitle>
        <CardDescription>
          {isSignup
            ? "Start with an account, then connect Canvas during onboarding."
            : "Sign in to return to your prioritized school workspace."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          className="w-full"
          disabled={Boolean(loading)}
          onClick={handleGoogleAuth}
          type="button"
          variant="secondary"
        >
          {loading === "google" ? <Loader2 className="animate-spin" /> : <Globe2 />}
          Continue with Google
        </Button>

        {isSignup && isDemoModeEnabled ? (
          <Button asChild className="w-full" variant="outline">
            <Link href="/auth/demo">Continue in demo mode</Link>
          </Button>
        ) : null}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>or use email</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-3" onSubmit={handleEmailAuth}>
          {isSignup ? (
            <label className="block space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Full name</span>
              <Input
                autoComplete="name"
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Arya Bansal"
                value={fullName}
              />
            </label>
          ) : null}

          <label className="block space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <Input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@school.edu"
              required
              type="email"
              value={email}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Password</span>
            <Input
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              {notice}
            </div>
          ) : null}

          <Button className="w-full" disabled={Boolean(loading)} type="submit">
            {loading === "email" ? <Loader2 className="animate-spin" /> : null}
            {isSignup ? "Create account" : "Sign in"}
            {!loading ? <ArrowRight /> : null}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignup ? "Already have an account?" : "New to chapters.ai?"}{" "}
          <Link className="font-medium text-foreground hover:underline" href={isSignup ? "/login" : "/signup"}>
            {isSignup ? "Sign in" : "Create one"}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
