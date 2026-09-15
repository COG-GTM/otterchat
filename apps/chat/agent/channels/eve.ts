import { defaultEveAuth, eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";
import { anonymousEveAuth, neonAuthEveAuth, passwordEveAuth } from "@/lib/eve-auth";
import {
  IMAGE_MODEL_ATTRIBUTE,
  IMAGE_MODEL_HEADER,
  TEXT_MODEL_ATTRIBUTE,
  TEXT_MODEL_HEADER,
  resolveImageModel,
  resolveTextModel,
} from "@/lib/models";

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

export default eveChannel({
  auth: [neonAuthEveAuth, passwordEveAuth, anonymousEveAuth, vercelOidc(), localDev()],
  onMessage: (ctx) => {
    const auth = defaultEveAuth(ctx);

    if (!auth) {
      return null;
    }

    const headers = ctx.eve.request.headers;

    return {
      auth: {
        ...auth,
        attributes: {
          ...auth.attributes,
          [IMAGE_MODEL_ATTRIBUTE]: resolveImageModel(headers.get(IMAGE_MODEL_HEADER)).id,
          [TEXT_MODEL_ATTRIBUTE]: resolveTextModel(headers.get(TEXT_MODEL_HEADER)).id,
        },
      },
    };
  },
  uploadPolicy: {
    allowedMediaTypes: [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "application/pdf",
    ],
    maxBytes: MAX_ATTACHMENT_BYTES,
  },
});
