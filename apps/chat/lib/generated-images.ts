import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

// without a Blob token (local dev) the data URL is returned as-is
export async function storeGeneratedImage(image: {
  readonly base64: string;
  readonly mediaType: string;
}) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return `data:${image.mediaType};base64,${image.base64}`;
  }

  const extension = image.mediaType.split("/")[1]?.split("+")[0] ?? "png";
  const blob = await put(
    `generated-images/${randomUUID()}.${extension}`,
    Buffer.from(image.base64, "base64"),
    { access: "public", contentType: image.mediaType },
  );

  return blob.url;
}
