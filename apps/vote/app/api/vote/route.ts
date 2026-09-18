import { isDatabaseConfigured, getDb } from "@/lib/db/client";
import { VOTE_CHOICES, vote, type VoteChoice } from "@/lib/db/schema";
import { getVoterId } from "@/lib/voter";

function isChoice(value: unknown): value is VoteChoice {
  return typeof value === "string" && (VOTE_CHOICES as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const body: unknown = await request.json().catch(() => null);

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Expected a JSON object" }, { status: 400 });
  }

  const { pairId, choice } = body as { pairId?: unknown; choice?: unknown };

  if (typeof pairId !== "string" || !pairId) {
    return Response.json({ error: "'pairId' is required" }, { status: 400 });
  }

  if (!isChoice(choice)) {
    return Response.json(
      { error: `'choice' must be one of ${VOTE_CHOICES.join(", ")}` },
      { status: 400 },
    );
  }

  await getDb()
    .insert(vote)
    .values({ id: crypto.randomUUID(), pairId, voterId: await getVoterId(), choice })
    .onConflictDoNothing();

  return Response.json({ ok: true });
}
