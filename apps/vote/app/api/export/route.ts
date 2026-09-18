import { and, eq, inArray } from "drizzle-orm";
import { isAuthorizedIngest } from "@/lib/auth";
import { getDb, isDatabaseConfigured } from "@/lib/db/client";
import { vote, votePair } from "@/lib/db/schema";

/**
 * Preference pairs for the DPO trainer: one row per decisive vote, already
 * resolved into winner/loser image URLs.
 */
export async function GET(request: Request) {
  if (!isAuthorizedIngest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const loraVersion = new URL(request.url).searchParams.get("loraVersion");
  const decisive = inArray(vote.choice, ["a", "b"]);

  const rows = await getDb()
    .select({
      pairId: votePair.id,
      prompt: votePair.prompt,
      loraVersion: votePair.loraVersion,
      choice: vote.choice,
      imageAUrl: votePair.imageAUrl,
      imageBUrl: votePair.imageBUrl,
      voterId: vote.voterId,
      createdAt: vote.createdAt,
    })
    .from(vote)
    .innerJoin(votePair, eq(vote.pairId, votePair.id))
    .where(loraVersion ? and(decisive, eq(votePair.loraVersion, loraVersion)) : decisive)
    .orderBy(vote.createdAt);

  const pairs = rows.map((row) => ({
    pairId: row.pairId,
    prompt: row.prompt,
    loraVersion: row.loraVersion,
    winnerUrl: row.choice === "a" ? row.imageAUrl : row.imageBUrl,
    loserUrl: row.choice === "a" ? row.imageBUrl : row.imageAUrl,
    voterId: row.voterId,
    votedAt: row.createdAt,
  }));

  return Response.json({ count: pairs.length, pairs });
}
