import { type NextRequest, NextResponse } from "next/server";

const demoSessionMaxAge = 60 * 60 * 24;

export function GET(request: NextRequest) {
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
