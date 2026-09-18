import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { VOTER_COOKIE, VOTER_COOKIE_MAX_AGE } from "@/lib/voter";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(VOTER_COOKIE)?.value) {
    response.cookies.set(VOTER_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: VOTER_COOKIE_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
