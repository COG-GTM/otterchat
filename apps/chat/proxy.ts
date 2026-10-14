import { NextResponse, type NextRequest } from "next/server";
import {
  isUnresolvableServerActionRequest,
  loadServerActionIds,
  type ServerActionIds,
} from "@/lib/server-action-request";

let serverActionIds: ServerActionIds | undefined;

export function proxy(request: NextRequest) {
  serverActionIds ??= loadServerActionIds();

  if (isUnresolvableServerActionRequest(request, serverActionIds)) {
    return new NextResponse("Server action not found.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image).*)",
      has: [{ type: "header", key: "next-action" }],
    },
  ],
};
