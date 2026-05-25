import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

const demoSessionMaxAge = 60 * 60 * 24;

export function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE !== "true") {
    return NextResponse.json({ error: "Demo mode is disabled in production." }, { status: 404 });
  }

  const limit = checkRateLimit(request, "auth-demo", {
    limit: 10,
    windowMs: 15 * 60 * 1000
  });

  if (!limit.ok) {
    return rateLimitResponse(limit);
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/dashboard";
  redirectUrl.search = "";

  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set("chapters_demo_session", "1", {
    httpOnly: true,
    maxAge: demoSessionMaxAge,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}
