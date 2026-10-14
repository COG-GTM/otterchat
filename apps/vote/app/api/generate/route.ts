import { and, count, eq, gt, like } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/lib/db/client";
import { votePair } from "@/lib/db/schema";
import { otterimageConfigured, renderPair } from "@/lib/otterimage";
import { buildPrompt, MAX_SUFFIX_CHARS } from "@/lib/prompt-prefix";
import { getVoterId } from "@/lib/voter";

export const maxDuration = 300;

const PER_VOTER_PER_HOUR = 5;
const ALL_VOTERS_PER_DAY = 200;
const HOUR_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  if (!isDatabaseConfigured() || !otterimageConfigured()) {
    return Response.json({ error: "Prompt generation is not configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { suffix?: unknown } | null;
  const prompt = typeof body?.suffix === "string" ? buildPrompt(body.suffix) : null;

  if (!prompt) {
    return Response.json(
      { error: `Describe the scene in 1 to ${MAX_SUFFIX_CHARS} characters` },
      { status: 400 },
    );
  }

  const db = getDb();
  const source = `voter:${await getVoterId()}`;
  const [[mine], [everyone]] = await Promise.all([
    db
      .select({ value: count() })
      .from(votePair)
      .where(and(eq(votePair.source, source), gt(votePair.createdAt, new Date(Date.now() - HOUR_MS)))),
    db
      .select({ value: count() })
      .from(votePair)
      .where(and(like(votePair.source, "voter:%"), gt(votePair.createdAt, new Date(Date.now() - 24 * HOUR_MS)))),
  ]);

  if ((mine?.value ?? 0) >= PER_VOTER_PER_HOUR || (everyone?.value ?? 0) >= ALL_VOTERS_PER_DAY) {
    return Response.json({ error: "Prompt limit reached, try again later" }, { status: 429 });
  }

  const pair = await renderPair(prompt);
  const [row] = await db
    .insert(votePair)
    .values({ id: crypto.randomUUID(), source, ...pair })
    .returning({
      id: votePair.id,
      prompt: votePair.prompt,
      loraVersion: votePair.loraVersion,
      imageAUrl: votePair.imageAUrl,
      imageBUrl: votePair.imageBUrl,
    });

  return Response.json({ pair: row });
}
