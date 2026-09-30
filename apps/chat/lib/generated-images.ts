import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

// Generated images are stored in Vercel Blob so chat events carry a short URL
// instead of a multi-megabyte data URL. Without a Blob token (local
// development) the data URL is returned as-is.
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
