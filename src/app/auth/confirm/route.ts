import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getSafeNext(value: string | null, fallback = "/onboarding") {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return fallback;
}

function getConfirmationErrorMessage(request: NextRequest) {
  const errorCode = request.nextUrl.searchParams.get("error_code");
  const errorDescription = request.nextUrl.searchParams.get("error_description");

  if (errorCode === "otp_expired") {
    return "That email confirmation link has expired or was already used. Try signing in with the same email and password.";
  }

  return errorDescription ?? "Could not confirm your email. Please try again.";
}

function redirectToLoginWithError(request: NextRequest, next: string, message: string) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", next);
  loginUrl.searchParams.set("error", message);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = getSafeNext(request.nextUrl.searchParams.get("next"));
  const redirectTo = request.nextUrl.clone();

  redirectTo.pathname = next;
  redirectTo.search = "";

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = supabase
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("Supabase is not configured") };

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }

    return redirectToLoginWithError(
      request,
      next,
      "The email link was accepted, but this browser could not finish signing you in. Try signing in with the same email and password."
    );
  }

  if (tokenHash && type) {
    const supabase = await createServerSupabaseClient();
    const { error } = supabase
      ? await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type
        })
      : { error: new Error("Supabase is not configured") };

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  return redirectToLoginWithError(request, next, getConfirmationErrorMessage(request));
}
