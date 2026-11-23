import { NextResponse, type NextRequest } from "next/server";

// Page routes only accept GET/HEAD and server-action POSTs (sent with a `Next-Action` header).
// Any other POST (e.g. scanners) reaches the PPR renderer as a no-JS form action, and on Vercel
// fails to resume the prerendered shell ("Couldn't find all resumable slots by key/index").
export function proxy(request: NextRequest) {
  const { method, headers } = request;
  if (method === "GET" || method === "HEAD" || headers.has("next-action")) {
    return NextResponse.next();
  }

  return new NextResponse(null, { status: 405, headers: { Allow: "GET, HEAD" } });
}

export const config = {
  matcher: ["/", "/index", "/chat/:path*", "/auth/:path*", "/sentry-example-page"],
};
