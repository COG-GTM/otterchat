export function otterimageConfigured() {
  return Boolean(
    process.env.OTTERIMAGE_URL &&
      process.env.OTTERIMAGE_MODAL_KEY &&
      process.env.OTTERIMAGE_MODAL_SECRET,
  );
}

const MAX_PROMPT_CHARS = 1000;

export async function generateOtterimage(prompt: string) {
  const response = await fetch(process.env.OTTERIMAGE_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Modal-Key": process.env.OTTERIMAGE_MODAL_KEY!,
      "Modal-Secret": process.env.OTTERIMAGE_MODAL_SECRET!,
    },
    body: JSON.stringify({ prompt: Array.from(prompt).slice(0, MAX_PROMPT_CHARS).join("") }),
    signal: AbortSignal.timeout(300_000),
  });

  if (!response.ok) {
    throw new Error(`otterimage returned ${response.status}: ${await response.text()}`);
  }

  return {
    base64: Buffer.from(await response.arrayBuffer()).toString("base64"),
    mediaType: response.headers.get("content-type") ?? "image/png",
  };
}
