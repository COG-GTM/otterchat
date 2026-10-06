export type ChatAttachment = {
  readonly data: string;
  readonly filename: string;
  readonly id: string;
  readonly mediaType: string;
  readonly size: number;
};

export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
export const MAX_ATTACHMENTS = 4;
export const ACCEPTED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export const ATTACHMENT_ACCEPT = ACCEPTED_ATTACHMENT_TYPES.join(",");

export function getAttachmentError(file: File) {
  if (!ACCEPTED_ATTACHMENT_TYPES.some((type) => type === file.type)) {
    return `${file.name} is not a supported file type.`;
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `${file.name} is larger than 8 MB.`;
  }

  return null;
}

export async function readAttachment(file: File): Promise<ChatAttachment> {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("error", () => reject(new Error(`Failed to read ${file.name}.`)));
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.readAsDataURL(file);
  });

  return {
    data,
    filename: file.name,
    id: `${file.name}:${file.size}:${file.lastModified}`,
    mediaType: file.type,
    size: file.size,
  };
}

export function toEveFileParts(attachments: readonly ChatAttachment[]) {
  return attachments.map((attachment) => ({
    data: attachment.data,
    filename: attachment.filename,
    mediaType: attachment.mediaType,
    type: "file" as const,
  }));
}

/** In-memory handoff keeps multi-MB data URLs out of session storage before a chat exists. */
const pendingAttachments = new Map<string, readonly ChatAttachment[]>();

export function writePendingAttachments(
  chatId: string,
  attachments: readonly ChatAttachment[],
) {
  if (attachments.length === 0) {
    return;
  }

  pendingAttachments.set(chatId, attachments);
}

export function takePendingAttachments(chatId: string) {
  const attachments = pendingAttachments.get(chatId);

  pendingAttachments.delete(chatId);

  return attachments ?? [];
}
