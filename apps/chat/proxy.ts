import { NextResponse, type NextRequest } from "next/server";

// Page routes only render for GET/HEAD and server-action POSTs (sent with a `Next-Action` header).
// Any other POST (e.g. scanners) would reach the PPR renderer as a no-JS form action, and on Vercel
// fails to resume the prerendered shell ("Couldn't find all resumable slots by key/index").
// 303 turns it into a GET, so 307 redirects that preserve POST (e.g. to /auth/error) still land.
export function proxy(request: NextRequest) {
  const { method, headers } = request;
  if (method === "GET" || method === "HEAD" || headers.has("next-action")) {
    return NextResponse.next();
  }

  return NextResponse.redirect(request.url, 303);
}

export const config = {
  matcher: ["/", "/index", "/chat/:path*", "/auth/:path*", "/sentry-example-page"],
};
