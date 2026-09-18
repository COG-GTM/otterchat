import { isAuthorizedIngest } from "@/lib/auth";
import { getDb, isDatabaseConfigured } from "@/lib/db/client";
import { votePair, type ImageMeta } from "@/lib/db/schema";

type IncomingPair = {
  readonly prompt?: unknown;
  readonly loraVersion?: unknown;
  readonly imageAUrl?: unknown;
  readonly imageBUrl?: unknown;
  readonly imageAMeta?: unknown;
  readonly imageBMeta?: unknown;
  readonly source?: unknown;
};

function parsePair(raw: IncomingPair) {
  const { prompt, loraVersion, imageAUrl, imageBUrl, source } = raw;

  if (
    typeof prompt !== "string" ||
    !prompt.trim() ||
    typeof loraVersion !== "string" ||
    !loraVersion.trim() ||
    typeof imageAUrl !== "string" ||
    typeof imageBUrl !== "string"
  ) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    prompt: prompt.trim(),
    loraVersion: loraVersion.trim(),
    imageAUrl,
    imageBUrl,
    imageAMeta: (raw.imageAMeta ?? null) as ImageMeta | null,
    imageBMeta: (raw.imageBMeta ?? null) as ImageMeta | null,
    source: typeof source === "string" && source.trim() ? source.trim() : "modal",
  };
}

/** Ingest endpoint for the generation job: `{ pairs: [...] }`. */
export async function POST(request: Request) {
  if (!isAuthorizedIngest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const body: unknown = await request.json().catch(() => null);
  const rawPairs = (body as { pairs?: unknown })?.pairs;

  if (!Array.isArray(rawPairs) || rawPairs.length === 0) {
    return Response.json({ error: "'pairs' must be a non-empty array" }, { status: 400 });
  }

  if (rawPairs.length > 200) {
    return Response.json({ error: "At most 200 pairs per request" }, { status: 400 });
  }

  const rows = rawPairs.map((raw) => parsePair(raw as IncomingPair));

  if (rows.some((row) => row === null)) {
    return Response.json(
      { error: "Each pair needs prompt, loraVersion, imageAUrl and imageBUrl" },
      { status: 400 },
    );
  }

  const inserted = await getDb()
    .insert(votePair)
    .values(rows.filter((row) => row !== null))
    .returning({ id: votePair.id });

  return Response.json({ inserted: inserted.length, ids: inserted.map((row) => row.id) });
}
