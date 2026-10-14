import { experimental_generateImage as generateImage, gateway, generateText } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { storeGeneratedImage } from "@/lib/generated-images";
import { IMAGE_MODEL_ATTRIBUTE, type ImageModel, resolveImageModel } from "@/lib/models";

const IMAGE_TIMEOUT_MS = 90_000;

export default defineTool({
  description:
    "Generate an image from a text prompt. Use whenever the user asks to draw, create, or illustrate an image. This cannot edit an existing image.",
  inputSchema: z.object({
    prompt: z.string().min(1).describe("Detailed description of the image to generate."),
  }),
  outputSchema: z.object({
    image: z.string().describe("URL of the generated image."),
    model: z.string(),
    prompt: z.string(),
  }),
  async execute({ prompt }, ctx) {
    const selected = ctx.session.auth.current?.attributes?.[IMAGE_MODEL_ATTRIBUTE];
    const model = resolveImageModel(typeof selected === "string" ? selected : undefined);
    const timeout = AbortSignal.timeout(IMAGE_TIMEOUT_MS);

    let image: GeneratedImage | undefined;
    try {
      image = await requestImage(model, prompt, AbortSignal.any([ctx.abortSignal, timeout]));
    } catch (error) {
      if (timeout.aborted && !ctx.abortSignal.aborted) {
        throw new Error(`${model.label} timed out after ${IMAGE_TIMEOUT_MS / 1000}s.`, {
          cause: error,
        });
      }
      throw error;
    }

    if (!image) {
      throw new Error(`${model.label} did not return an image.`);
    }

    return { image: await storeGeneratedImage(image), model: model.id, prompt };
  },
  toModelOutput: (output) => ({
    type: "text",
    value: `Generated an image with ${output.model} for: ${output.prompt}. It is already shown to the user.`,
  }),
});

type GeneratedImage = { base64: string; mediaType: string };

async function requestImage(
  model: ImageModel,
  prompt: string,
  abortSignal: AbortSignal,
): Promise<GeneratedImage | undefined> {
  if (model.kind === "image") {
    const result = await generateImage({
      model: gateway.imageModel(model.id),
      prompt,
      abortSignal,
    });
    return { base64: result.image.base64, mediaType: result.image.mediaType ?? "image/png" };
  }

  const result = await generateText({
    model: gateway(model.id),
    prompt,
    abortSignal,
  });
  return result.files.find((candidate) => candidate.mediaType.startsWith("image/"));
}
