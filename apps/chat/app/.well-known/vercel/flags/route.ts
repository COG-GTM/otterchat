import { createFlagsDiscoveryEndpoint, getProviderData } from "flags/next";
import type { NextRequest } from "next/server";
import * as flags from "@/lib/flags";

const discoveryEndpoint = createFlagsDiscoveryEndpoint(async () => getProviderData(flags));

// flags' verifyAccess throws when FLAGS_SECRET is unset; fail closed with a 401 instead of a 500.
export async function GET(request: NextRequest) {
  if (!process.env.FLAGS_SECRET) return Response.json(null, { status: 401 });
  return discoveryEndpoint(request);
}
