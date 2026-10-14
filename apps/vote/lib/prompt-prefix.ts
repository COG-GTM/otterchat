export const PROMPT_PREFIX = "Devin the software engineer";
export const MAX_SUFFIX_CHARS = 300;

/** Every vote prompt starts with the trigger phrase; voters and the AI only write what follows it. */
export function buildPrompt(suffix: string): string | null {
  const rest = suffix
    .replace(/\s+/g, " ")
    .trim()
    .replace(new RegExp(`^${PROMPT_PREFIX}\\b`, "i"), "")
    .trim();

  if (!rest || Array.from(rest).length > MAX_SUFFIX_CHARS) {
    return null;
  }

  return `${PROMPT_PREFIX} ${rest}`;
}
