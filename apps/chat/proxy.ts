import { NextResponse, type NextRequest } from "next/server";

// Page routes only render for GET/HEAD and server-action POSTs (sent with a `Next-Action` header).
// Any other POST (e.g. scanners) would reach the PPR renderer as a no-JS form action, and on Vercel
// fails to resume the prerendered shell ("Couldn't find all resumable slots by key/index").
// A 303 turns those POSTs into GETs, so 307 redirects that preserve POST (e.g. to /auth/error)
// still land; other methods are rejected.
export function proxy(request: NextRequest) {
  const { method, headers } = request;
  if (method === "GET" || method === "HEAD" || headers.has("next-action")) {
    return NextResponse.next();
  }

  if (method === "POST") {
    return NextResponse.redirect(request.url, 303);
  }

  return new NextResponse(null, { status: 405, headers: { Allow: "GET, HEAD, POST" } });
}

export const config = {
  matcher: ["/", "/index", "/chat/:path*", "/auth/:path*", "/sentry-example-page"],
};
