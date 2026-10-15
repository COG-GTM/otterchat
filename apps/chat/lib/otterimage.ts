const MAX_PROMPT_CHARS = 1000;

export function toOtterimagePrompt(prompt: string) {
  return Array.from(prompt.trim()).slice(0, MAX_PROMPT_CHARS).join("");
}

export function hasOtterimageCredentials() {
  return Boolean(process.env.OTTERIMAGE_MODAL_KEY && process.env.OTTERIMAGE_MODAL_SECRET);
}

export async function generateOtterimage(endpoint: string, prompt: string) {
  const response = await fetch(endpoint, {
    body: JSON.stringify({ prompt }),
    headers: {
      "Content-Type": "application/json",
      "Modal-Key": process.env.OTTERIMAGE_MODAL_KEY ?? "",
      "Modal-Secret": process.env.OTTERIMAGE_MODAL_SECRET ?? "",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`otterimage request failed: ${response.status} ${await response.text()}`);
  }

  return {
    base64: Buffer.from(await response.arrayBuffer()).toString("base64"),
    mediaType: response.headers.get("content-type") ?? "image/png",
  };
}
