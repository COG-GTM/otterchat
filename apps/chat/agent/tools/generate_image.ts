import { experimental_generateImage as generateImage, gateway, generateText } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { IMAGE_MODEL_ATTRIBUTE, resolveImageModel } from "@/lib/models";

// The runtime tool name comes from the filename, so the model sees this as
// `generate_image`. The image model is picked in the composer and arrives on
// the session auth attributes; unknown ids fall back to the catalog default.
export default defineTool({
  description:
    "Generate an image from a text prompt. Use whenever the user asks to draw, create, illustrate, or edit an image.",
  inputSchema: z.object({
    prompt: z.string().min(1).describe("Detailed description of the image to generate."),
  }),
  outputSchema: z.object({
    image: z.string().describe("Generated image as a data URL."),
    model: z.string(),
    prompt: z.string(),
  }),
  async execute({ prompt }, ctx) {
    const selected = ctx.session.auth.current?.attributes?.[IMAGE_MODEL_ATTRIBUTE];
    const model = resolveImageModel(typeof selected === "string" ? selected : undefined);

    if (model.kind === "image") {
      const result = await generateImage({
        model: gateway.imageModel(model.id),
        prompt,
      });

      return {
        image: `data:${result.image.mediaType ?? "image/png"};base64,${result.image.base64}`,
        model: model.id,
        prompt,
      };
    }

    // Gemini image models are language models in the gateway: they return the
    // generated image as a file on an ordinary text generation.
    const result = await generateText({
      model: gateway(model.id),
      prompt,
    });
    const file = result.files.find((candidate) => candidate.mediaType.startsWith("image/"));

    if (!file) {
      throw new Error(`${model.label} did not return an image.`);
    }

    return {
      image: `data:${file.mediaType};base64,${file.base64}`,
      model: model.id,
      prompt,
    };
  },
  toModelOutput: (output) => ({
    type: "text",
    value: `Generated an image with ${output.model} for: ${output.prompt}. It is already shown to the user.`,
  }),
});
