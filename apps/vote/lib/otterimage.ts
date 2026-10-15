import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";

export type OtterimageModel = { readonly id: string; readonly label: string };

const MODELS = [
  {
    id: "otterimage-1.0",
    label: "otterimage 1.0",
    endpoint: "https://cognition-gtm--otterimage-ef15dbaa17ce47a1882f8db5603fedf1.us-east.modal.run",
  },
  {
    id: "otterimage-previous",
    label: "otterimage (previous)",
    endpoint: "https://cognition-gtm--otterimage-eb43903921284b49b4e1f6e331c93428.us-east.modal.run",
  },
] as const;

export type RenderedImage = {
  readonly url: string;
  readonly meta: { readonly seed: number; readonly numInferenceSteps: number; readonly guidanceScale: number };
};

const NUM_INFERENCE_STEPS = 28;
const GUIDANCE_SCALE = 4;
const PAIR_TIMEOUT_MS = 280_000;

export function availableModels(): OtterimageModel[] {
  if (!process.env.OTTERIMAGE_MODAL_KEY || !process.env.OTTERIMAGE_MODAL_SECRET || !process.env.BLOB_READ_WRITE_TOKEN) {
    return [];
  }

  return MODELS.map(({ id, label }) => ({ id, label }));
}

function modelUrl(modelId: string) {
  return MODELS.find((candidate) => candidate.id === modelId)?.endpoint;
}

async function renderImage(url: string, prompt: string, seed: number, signal: AbortSignal): Promise<RenderedImage> {
  const response = await fetch(url, {
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
    signal,
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
export async function renderPair(prompt: string, modelId: string) {
  const url = modelUrl(modelId);

  if (!url) {
    throw new Error(`Unknown or unconfigured otterimage model: ${modelId}`);
  }

  const signal = AbortSignal.timeout(PAIR_TIMEOUT_MS);
  const seedA = Math.floor(Math.random() * 2 ** 31);
  const a = await renderImage(url, prompt, seedA, signal);
  let b: RenderedImage;

  try {
    b = await renderImage(url, prompt, (seedA + 1 + Math.floor(Math.random() * 2 ** 30)) % 2 ** 31, signal);
  } catch (error) {
    await discardImages([a.url]);
    throw error;
  }

  return {
    prompt,
    loraVersion: modelId,
    imageAUrl: a.url,
    imageBUrl: b.url,
    imageAMeta: a.meta,
    imageBMeta: b.meta,
  };
}

export async function discardImages(urls: readonly string[]) {
  await del([...urls]).catch((error: unknown) => console.error("failed to delete orphaned pair images", error));
}
