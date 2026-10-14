import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { otterimageConfigured, renderPair } from "../lib/otterimage.ts";
import { buildPrompt } from "../lib/prompt-prefix.ts";
import { generatePromptSuffixes } from "../lib/prompts.ts";

const { values } = parseArgs({
  options: {
    count: { type: "string", default: "20" },
    prompts: { type: "string" },
    "vote-url": { type: "string", default: process.env.OTTERVOTE_URL ?? "http://localhost:3100" },
    "dry-run": { type: "boolean", default: false },
  },
});

const suffixes = values.prompts
  ? readFileSync(values.prompts, "utf8").split("\n").filter((line) => line.trim())
  : await generatePromptSuffixes(Number(values.count));
const prompts = suffixes.map((suffix) => buildPrompt(suffix)).filter((prompt) => prompt !== null);

console.log(`${prompts.length} prompts:`);
for (const prompt of prompts) {
  console.log(`  ${prompt}`);
}

if (values["dry-run"]) {
  process.exit(0);
}

if (!otterimageConfigured() || !process.env.INGEST_TOKEN) {
  throw new Error("Set OTTERIMAGE_URL, OTTERIMAGE_MODAL_KEY, OTTERIMAGE_MODAL_SECRET, BLOB_READ_WRITE_TOKEN and INGEST_TOKEN.");
}

let posted = 0;

for (const prompt of prompts) {
  const pair = await renderPair(prompt);
  const response = await fetch(new URL("/api/pairs", values["vote-url"]), {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.INGEST_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ pairs: [{ ...pair, source: "generate-pairs" }] }),
  });

  if (!response.ok) {
    throw new Error(`ottervote /api/pairs returned ${response.status}: ${await response.text()}`);
  }

  posted += 1;
  console.log(`[${posted}/${prompts.length}] ${prompt}`);
}
