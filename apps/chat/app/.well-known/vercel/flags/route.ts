import { createFlagsDiscoveryEndpoint, getProviderData } from "flags/next";
import type { NextRequest } from "next/server";
import * as flags from "@/lib/flags";

const discoveryEndpoint = createFlagsDiscoveryEndpoint(async () => getProviderData(flags));

// The flags SDK throws (500) when a request carries an Authorization header and
// FLAGS_SECRET is unset; without a secret no caller can be authorized anyway.
export async function GET(request: NextRequest) {
  if (!process.env.FLAGS_SECRET) {
    console.warn("flags: FLAGS_SECRET is not set; /.well-known/vercel/flags is disabled.");
    return Response.json(null, { status: 401 });
  }
  return discoveryEndpoint(request);
}
