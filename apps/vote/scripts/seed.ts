import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { votePair } from "../lib/db/schema.ts";

/**
 * Sample pairs so the app is usable before the FLUX.2 LoRA has ever generated
 * anything. Real pairs arrive through POST /api/pairs.
 */
const IMAGES = [
  "https://modal-public-assets.s3.amazonaws.com/example-dreambooth-app/fkRYgv6.png",
  "https://modal-public-assets.s3.amazonaws.com/example-dreambooth-app/98k9yDg.jpg",
  "https://modal-public-assets.s3.amazonaws.com/example-dreambooth-app/gHlW8Kw.jpg",
];

const PROMPTS = [
  "a photo of Qwerty the Golden Retriever as an astronaut on the moon",
  "a photo of Qwerty the Golden Retriever wearing a chef hat in a kitchen",
  "a photo of Qwerty the Golden Retriever surfing a wave at sunset",
  "an oil painting of Qwerty the Golden Retriever in a Renaissance portrait",
  "a photo of Qwerty the Golden Retriever sitting in a Tokyo alley at night",
  "a photo of Qwerty the Golden Retriever hiking on a snowy mountain ridge",
  "a studio photo of Qwerty the Golden Retriever on a bright orange backdrop",
  "a photo of Qwerty the Golden Retriever reading a newspaper on a park bench",
];

const url = process.env.DATABASE_URL?.trim();

if (!url) {
  throw new Error("DATABASE_URL is required to seed.");
}

const db = drizzle({ client: neon(url) });

const rows = PROMPTS.map((prompt, index) => ({
  id: crypto.randomUUID(),
  prompt,
  loraVersion: "sample-v0",
  source: "sample",
  imageAUrl: IMAGES[index % IMAGES.length],
  imageBUrl: IMAGES[(index + 1) % IMAGES.length],
  imageAMeta: { seed: 1000 + index, numInferenceSteps: 28, guidanceScale: 4 },
  imageBMeta: { seed: 2000 + index, numInferenceSteps: 28, guidanceScale: 4 },
}));

const inserted = await db.insert(votePair).values(rows).returning({ id: votePair.id });

console.log(`Seeded ${inserted.length} sample pairs.`);
