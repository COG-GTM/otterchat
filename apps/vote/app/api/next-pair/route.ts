import { isDatabaseConfigured } from "@/lib/db/client";
import { getProgress, getUnvotedPairs } from "@/lib/pairs";
import { getVoterId } from "@/lib/voter";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const limitParam = Number(new URL(request.url).searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 25) : 10;
  const voterId = await getVoterId();
  const [pairs, progress] = await Promise.all([
    getUnvotedPairs(voterId, limit),
    getProgress(voterId),
  ]);

  return Response.json({ pairs, progress });
}
