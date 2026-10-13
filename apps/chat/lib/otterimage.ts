export function isOtterimageConfigured() {
  return Boolean(
    process.env.OTTERIMAGE_URL &&
      process.env.OTTERIMAGE_MODAL_KEY &&
      process.env.OTTERIMAGE_MODAL_SECRET,
  );
}

export async function generateOtterimage(prompt: string) {
  const response = await fetch(process.env.OTTERIMAGE_URL!, {
    body: JSON.stringify({ prompt }),
    headers: {
      "Content-Type": "application/json",
      "Modal-Key": process.env.OTTERIMAGE_MODAL_KEY!,
      "Modal-Secret": process.env.OTTERIMAGE_MODAL_SECRET!,
    },
    method: "POST",
    signal: AbortSignal.timeout(280_000),
  });

  if (!response.ok) {
    throw new Error(`otterimage request failed: ${response.status} ${await response.text()}`);
  }

  return {
    base64: Buffer.from(await response.arrayBuffer()).toString("base64"),
    mediaType: response.headers.get("content-type") ?? "image/png",
  };
}
