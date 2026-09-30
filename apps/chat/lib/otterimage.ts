/**
 * Client for the otterimage FLUX.2 LoRA `generate` endpoint
 * (otterimage/serve_flux2_lora.py), which sits behind Modal proxy auth.
 */
export async function generateOtterimage(prompt: string) {
  const url = process.env.OTTERIMAGE_URL;
  const key = process.env.OTTERIMAGE_MODAL_KEY;
  const secret = process.env.OTTERIMAGE_MODAL_SECRET;

  if (!url || !key || !secret) {
    throw new Error(
      "otterimage is not configured: set OTTERIMAGE_URL, OTTERIMAGE_MODAL_KEY and OTTERIMAGE_MODAL_SECRET.",
    );
  }

  const response = await fetch(url, {
    body: JSON.stringify({ prompt }),
    headers: {
      "Content-Type": "application/json",
      "Modal-Key": key,
      "Modal-Secret": secret,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`otterimage request failed (${response.status}): ${await response.text()}`);
  }

  const mediaType = response.headers.get("content-type") ?? "image/png";
  const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");

  return `data:${mediaType};base64,${base64}`;
}
