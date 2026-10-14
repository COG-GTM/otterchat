import { gateway, generateText } from "ai";
import { PROMPT_PREFIX } from "./prompt-prefix.ts";

export const PROMPT_MODEL = "google/gemini-3.5-flash";

export async function generatePromptSuffixes(count: number, model = PROMPT_MODEL): Promise<string[]> {
  const { text } = await generateText({
    model: gateway(model),
    prompt: [
      `Write ${count} distinct image prompt endings. Each one completes the sentence "${PROMPT_PREFIX} ...".`,
      "Vary scenes (offices, desks with monitors, streets, kitchens, stages, nature, space), actions, outfits, props, camera angles and art styles, including realistic photo scenes.",
      "Never describe what Devin looks like or what kind of creature he is, and never use the word otter.",
      "One ending per line, 4 to 20 words, no numbering, no quotes, and do not repeat the prefix.",
    ].join("\n"),
  });

  return [
    ...new Set(
      text
        .split("\n")
        .map((line) => line.replace(/^[\s\d.)\-*"]+|["\s]+$/g, ""))
        .filter((line) => line && !/otter/i.test(line)),
    ),
  ].slice(0, count);
}
