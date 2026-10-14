import { experimental_generateImage as generateImage, gateway, generateText } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { storeGeneratedImage } from "@/lib/generated-images";
import { IMAGE_MODEL_ATTRIBUTE, IMAGE_MODELS, resolveImageModel } from "@/lib/models";
import {
  generateOtterimage,
  isOtterimageConfigured,
  OTTERIMAGE_MAX_PROMPT_LENGTH,
} from "@/lib/otterimage";

export default defineTool({
  description:
    "Generate an image from a text prompt. Use whenever the user asks to draw, create, or illustrate an image. This cannot edit an existing image. Refer to Devin, the otterchat mascot, as 'Devin the software engineer'.",
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
    const resolved = resolveImageModel(typeof selected === "string" ? selected : undefined);
    // The picker's catalog is client-side and can't see server env; fall back to
    // the default image model when the Modal endpoint isn't configured here.
    const model =
      resolved.kind === "otterimage" && !isOtterimageConfigured() ? IMAGE_MODELS[0]! : resolved;

    if (model.kind === "otterimage") {
      const otterimagePrompt = prompt.trim().slice(0, OTTERIMAGE_MAX_PROMPT_LENGTH);
      if (!otterimagePrompt) {
        throw new Error("image prompt is empty.");
      }

      return {
        image: await storeGeneratedImage(await generateOtterimage(otterimagePrompt)),
        model: model.id,
        prompt: otterimagePrompt,
      };
    }

    if (model.kind === "image") {
      const result = await generateImage({
        model: gateway.imageModel(model.id),
        prompt,
      });

      return {
        image: await storeGeneratedImage({
          base64: result.image.base64,
          mediaType: result.image.mediaType ?? "image/png",
        }),
        model: model.id,
        prompt,
      };
    }

    // Gemini image models return the image as a file on a text generation
    const result = await generateText({
      model: gateway(model.id),
      prompt,
    });
    const file = result.files.find((candidate) => candidate.mediaType.startsWith("image/"));

    if (!file) {
      throw new Error(`${model.label} did not return an image.`);
    }

    return {
      image: await storeGeneratedImage(file),
      model: model.id,
      prompt,
    };
  },
  toModelOutput: (output) => ({
    type: "text",
    value: `Generated an image with ${output.model} for: ${output.prompt}. It is already shown to the user.`,
  }),
});
