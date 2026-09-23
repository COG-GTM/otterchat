import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { votePair } from "../lib/db/schema.ts";

/**
 * Sample pairs so the app is usable before the FLUX.2 LoRA has ever generated
 * anything. Real pairs arrive through POST /api/pairs.
 */
const IMAGES = [
  "https://cw0qbb0hhdh5qaw7.public.blob.vercel-storage.com/otterimage/instance_images/otter-laptop-standing.png",
  "https://cw0qbb0hhdh5qaw7.public.blob.vercel-storage.com/otterimage/instance_images/otter-laptop-badge.png",
  "https://cw0qbb0hhdh5qaw7.public.blob.vercel-storage.com/otterimage/instance_images/otter-laptop-circuits.png",
  "https://cw0qbb0hhdh5qaw7.public.blob.vercel-storage.com/otterimage/instance_images/otter-laptop-profile.png",
];

const PROMPTS = [
  "a photo of Devin the software engineer working inside a spaceship cockpit",
  "a photo of Devin the software engineer debugging at a standing desk",
  "a photo of Devin the software engineer presenting at a conference",
  "an oil painting of Devin the software engineer in a Renaissance portrait",
  "a photo of Devin the software engineer in a Tokyo alley at night",
  "a photo of Devin the software engineer reviewing a pull request on a laptop",
  "a studio photo of Devin the software engineer on a bright orange backdrop",
  "a photo of Devin the software engineer pair programming in an open office",
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
