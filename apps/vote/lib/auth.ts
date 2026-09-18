import { timingSafeEqual } from "node:crypto";

/** Guards the ingest and export endpoints with a shared bearer token. */
export function isAuthorizedIngest(request: Request) {
  const expected = process.env.INGEST_TOKEN?.trim();

  if (!expected) {
    return false;
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expectedBytes = Buffer.from(expected, "utf8");
  const providedBytes = Buffer.from(provided, "utf8");

  if (providedBytes.length !== expectedBytes.length) {
    return false;
  }

  return timingSafeEqual(providedBytes, expectedBytes);
}
