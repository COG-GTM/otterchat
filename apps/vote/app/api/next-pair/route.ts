import { isDatabaseConfigured } from "@/lib/db/client";
import { getUnvotedPairs } from "@/lib/pairs";
import { getVoterId } from "@/lib/voter";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const limitParam = Number(new URL(request.url).searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 25) : 10;
  const pairs = await getUnvotedPairs(await getVoterId(), limit);

  return Response.json({ pairs });
}
