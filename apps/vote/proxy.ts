import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { VOTER_COOKIE, VOTER_COOKIE_MAX_AGE } from "@/lib/voter";

export function proxy(request: NextRequest) {
  const existing = request.cookies.get(VOTER_COOKIE)?.value;

  if (existing) {
    return NextResponse.next();
  }

  const voterId = crypto.randomUUID();

  // also set on the request so this handler reads the same id
  request.cookies.set(VOTER_COOKIE, voterId);

  const response = NextResponse.next({ request });

  response.cookies.set(VOTER_COOKIE, voterId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VOTER_COOKIE_MAX_AGE,
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
