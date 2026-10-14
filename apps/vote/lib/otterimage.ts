import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

export const OTTERIMAGE_LORA_VERSION = "otterimage-1.0";

export type RenderedImage = {
  readonly url: string;
  readonly meta: { readonly seed: number; readonly numInferenceSteps: number; readonly guidanceScale: number };
};

const NUM_INFERENCE_STEPS = 28;
const GUIDANCE_SCALE = 4;

export function otterimageConfigured() {
  return Boolean(
    process.env.OTTERIMAGE_URL &&
      process.env.OTTERIMAGE_MODAL_KEY &&
      process.env.OTTERIMAGE_MODAL_SECRET &&
      process.env.BLOB_READ_WRITE_TOKEN,
  );
}

async function renderImage(prompt: string, seed: number): Promise<RenderedImage> {
  const response = await fetch(process.env.OTTERIMAGE_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Modal-Key": process.env.OTTERIMAGE_MODAL_KEY!,
      "Modal-Secret": process.env.OTTERIMAGE_MODAL_SECRET!,
    },
    body: JSON.stringify({
      prompt,
      seed,
      num_inference_steps: NUM_INFERENCE_STEPS,
      guidance_scale: GUIDANCE_SCALE,
    }),
    signal: AbortSignal.timeout(300_000),
  });

  if (!response.ok) {
    throw new Error(`otterimage returned ${response.status}: ${await response.text()}`);
  }

  const blob = await put(`ottervote/pairs/${randomUUID()}.png`, Buffer.from(await response.arrayBuffer()), {
    access: "public",
    contentType: "image/png",
  });

  return { url: blob.url, meta: { seed, numInferenceSteps: NUM_INFERENCE_STEPS, guidanceScale: GUIDANCE_SCALE } };
}

/** Two samples of the same prompt with different seeds; sequential so a single warm container serves both. */
export async function renderPair(prompt: string) {
  const seedA = Math.floor(Math.random() * 2 ** 31);
  const a = await renderImage(prompt, seedA);
  const b = await renderImage(prompt, (seedA + 1 + Math.floor(Math.random() * 2 ** 30)) % 2 ** 31);

  return {
    prompt,
    loraVersion: OTTERIMAGE_LORA_VERSION,
    imageAUrl: a.url,
    imageBUrl: b.url,
    imageAMeta: a.meta,
    imageBMeta: b.meta,
  };
}
