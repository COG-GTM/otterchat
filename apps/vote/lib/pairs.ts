import { and, count, desc, eq, notExists, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { vote, votePair } from "@/lib/db/schema";

export type PairForVoter = {
  readonly id: string;
  readonly prompt: string;
  readonly loraVersion: string;
  readonly imageAUrl: string;
  readonly imageBUrl: string;
};

/** Pairs this voter has not seen yet, oldest first so everyone converges. */
export async function getUnvotedPairs(voterId: string, limit: number): Promise<PairForVoter[]> {
  const db = getDb();

  return db
    .select({
      id: votePair.id,
      prompt: votePair.prompt,
      loraVersion: votePair.loraVersion,
      imageAUrl: votePair.imageAUrl,
      imageBUrl: votePair.imageBUrl,
    })
    .from(votePair)
    .where(
      notExists(
        db
          .select({ one: sql`1` })
          .from(vote)
          .where(and(eq(vote.pairId, votePair.id), eq(vote.voterId, voterId))),
      ),
    )
    .orderBy(votePair.createdAt)
    .limit(limit);
}

export type VoteProgress = {
  readonly voted: number;
  readonly remaining: number;
  readonly total: number;
};

export async function getProgress(voterId: string): Promise<VoteProgress> {
  const db = getDb();
  const [[pairs], [voted]] = await Promise.all([
    db.select({ value: count() }).from(votePair),
    db.select({ value: count() }).from(vote).where(eq(vote.voterId, voterId)),
  ]);

  const total = pairs?.value ?? 0;
  const votedCount = Math.min(voted?.value ?? 0, total);

  return { voted: votedCount, remaining: total - votedCount, total };
}

export type LoraStats = {
  readonly loraVersion: string;
  readonly decided: number;
  readonly ties: number;
  readonly skips: number;
  readonly aWins: number;
  readonly bWins: number;
};

export async function getStatsByLora(): Promise<LoraStats[]> {
  const db = getDb();

  return db
    .select({
      loraVersion: votePair.loraVersion,
      decided: sql<number>`count(*) filter (where ${vote.choice} in ('a', 'b'))::int`,
      ties: sql<number>`count(*) filter (where ${vote.choice} = 'tie')::int`,
      skips: sql<number>`count(*) filter (where ${vote.choice} = 'skip')::int`,
      aWins: sql<number>`count(*) filter (where ${vote.choice} = 'a')::int`,
      bWins: sql<number>`count(*) filter (where ${vote.choice} = 'b')::int`,
    })
    .from(vote)
    .innerJoin(votePair, eq(vote.pairId, votePair.id))
    .groupBy(votePair.loraVersion)
    .orderBy(votePair.loraVersion);
}

export type VotesPerDay = {
  readonly day: string;
  readonly votes: number;
};

export async function getVotesPerDay(days = 14): Promise<VotesPerDay[]> {
  const db = getDb();

  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${vote.createdAt}), 'YYYY-MM-DD')`,
      votes: sql<number>`count(*)::int`,
    })
    .from(vote)
    .groupBy(sql`date_trunc('day', ${vote.createdAt})`)
    .orderBy(desc(sql`date_trunc('day', ${vote.createdAt})`))
    .limit(days);

  return rows.reverse();
}
