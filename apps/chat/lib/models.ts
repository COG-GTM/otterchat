/**
 * Runtime-selectable models. Ids are AI Gateway model ids; the browser only
 * sends an id from this catalog and the eve channel re-validates it before it
 * reaches the agent, so an unknown id always falls back to the defaults.
 */

export type TextModel = {
  readonly description: string;
  readonly id: string;
  readonly label: string;
};

export type ImageModel = {
  readonly description: string;
  readonly id: string;
  /**
   * `image` uses the image generation API; `language` returns image files from a text turn;
   * `otterimage` calls the FLUX.2 LoRA served from otterimage/serve_flux2_lora.py on Modal.
   */
  readonly kind: "image" | "language" | "otterimage";
  readonly label: string;
};

export const TEXT_MODELS: readonly TextModel[] = [
  {
    description: "Fast, low cost, vision capable",
    id: "deepseek/deepseek-v4.1-flash",
    label: "DeepSeek",
  },
  {
    description: "Strong reasoning and long context",
    id: "anthropic/claude-sonnet-5",
    label: "Sonnet",
  },
  {
    description: "Frontier quality with vision",
    id: "openai/gpt-6-astra",
    label: "GPT-6 Astra",
  },
];

export const IMAGE_MODELS: readonly ImageModel[] = [
  {
    description: "ByteDance Seedream 4.5",
    id: "bytedance/seedream-4.5",
    kind: "image",
    label: "Seedream 4.5",
  },
  {
    description: "Gemini 3.1 Flash Image (Nano Banana 2)",
    id: "google/gemini-3.1-flash-image",
    kind: "language",
    label: "Gemini Flash Image",
  },
  {
    description: "FLUX.2 [dev] + Devin LoRA on Modal",
    id: "otterimage/1.0",
    kind: "otterimage",
    label: "otterimage 1.0",
  },
];

export const DEFAULT_TEXT_MODEL_ID = TEXT_MODELS[0]!.id;
export const DEFAULT_IMAGE_MODEL_ID = IMAGE_MODELS[0]!.id;

export const TEXT_MODEL_HEADER = "x-otterchat-text-model";
export const IMAGE_MODEL_HEADER = "x-otterchat-image-model";

export const TEXT_MODEL_ATTRIBUTE = "otterchatTextModel";
export const IMAGE_MODEL_ATTRIBUTE = "otterchatImageModel";

export function resolveTextModel(id: string | null | undefined) {
  return TEXT_MODELS.find((model) => model.id === id) ?? TEXT_MODELS[0]!;
}

export function resolveImageModel(id: string | null | undefined) {
  return IMAGE_MODELS.find((model) => model.id === id) ?? IMAGE_MODELS[0]!;
}
