import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

export type OtterimageModel = { readonly id: string; readonly label: string };

const MODELS = [
  { id: "otterimage-1.0", label: "otterimage 1.0", urlEnv: "OTTERIMAGE_URL" },
  { id: "otterimage-previous", label: "otterimage (previous)", urlEnv: "OTTERIMAGE_PREVIOUS_URL" },
] as const;

export type RenderedImage = {
  readonly url: string;
  readonly meta: { readonly seed: number; readonly numInferenceSteps: number; readonly guidanceScale: number };
};

const NUM_INFERENCE_STEPS = 28;
const GUIDANCE_SCALE = 4;

export function availableModels(): OtterimageModel[] {
  if (!process.env.OTTERIMAGE_MODAL_KEY || !process.env.OTTERIMAGE_MODAL_SECRET || !process.env.BLOB_READ_WRITE_TOKEN) {
    return [];
  }

  return MODELS.filter((model) => process.env[model.urlEnv]).map(({ id, label }) => ({ id, label }));
}

function modelUrl(modelId: string) {
  const model = MODELS.find((candidate) => candidate.id === modelId);
  return model ? process.env[model.urlEnv] : undefined;
}

async function renderImage(url: string, prompt: string, seed: number): Promise<RenderedImage> {
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
export async function renderPair(prompt: string, modelId: string) {
  const url = modelUrl(modelId);

  if (!url) {
    throw new Error(`Unknown or unconfigured otterimage model: ${modelId}`);
  }

  const seedA = Math.floor(Math.random() * 2 ** 31);
  const a = await renderImage(url, prompt, seedA);
  const b = await renderImage(url, prompt, (seedA + 1 + Math.floor(Math.random() * 2 ** 30)) % 2 ** 31);

  return {
    prompt,
    loraVersion: modelId,
    imageAUrl: a.url,
    imageBUrl: b.url,
    imageAMeta: a.meta,
    imageBMeta: b.meta,
  };
}
