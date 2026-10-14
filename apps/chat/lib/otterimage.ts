const MAX_PROMPT_CHARS = 1000;

export function isOtterimageConfigured() {
  return Boolean(
    process.env.OTTERIMAGE_URL &&
      process.env.OTTERIMAGE_MODAL_KEY &&
      process.env.OTTERIMAGE_MODAL_SECRET,
  );
}

export async function generateOtterimage(prompt: string) {
  const url = process.env.OTTERIMAGE_URL;
  const key = process.env.OTTERIMAGE_MODAL_KEY;
  const secret = process.env.OTTERIMAGE_MODAL_SECRET;
  if (!url || !key || !secret) {
    throw new Error("otterimage is not configured.");
  }

  const response = await fetch(url, {
    body: JSON.stringify({ prompt: Array.from(prompt).slice(0, MAX_PROMPT_CHARS).join("") }),
    headers: {
      "Content-Type": "application/json",
      "Modal-Key": key,
      "Modal-Secret": secret,
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`otterimage failed with ${response.status}: ${await response.text()}`);
  }

  return {
    base64: Buffer.from(await response.arrayBuffer()).toString("base64"),
    mediaType: response.headers.get("content-type") ?? "image/png",
  };
}
