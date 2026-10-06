// POSTs to the session's Modal serve endpoint (otterimage/serve_flux2_lora.py).
// Returns null when the endpoint isn't configured so callers can fall back.

// the endpoint 422s prompts longer than 1000 characters (it counts code points)
const PROMPT_LIMIT = 1000;

function clampPrompt(prompt: string) {
  const chars = [...prompt];
  return chars.length <= PROMPT_LIMIT ? prompt : chars.slice(0, PROMPT_LIMIT).join("");
}

export async function generateOtterImage(prompt: string) {
  const url = process.env.OTTERIMAGE_URL;
  const key = process.env.OTTERIMAGE_MODAL_KEY;
  const secret = process.env.OTTERIMAGE_MODAL_SECRET;
  if (!url || !key || !secret) {
    return null;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Modal-Key": key,
      "Modal-Secret": secret,
    },
    body: JSON.stringify({ prompt: clampPrompt(prompt) }),
    // a cold serve container takes ~90s to render
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) {
    throw new Error(`otterimage endpoint returned ${response.status}: ${await response.text()}`);
  }

  return {
    base64: Buffer.from(await response.arrayBuffer()).toString("base64"),
    mediaType: response.headers.get("content-type") ?? "image/png",
  };
}
