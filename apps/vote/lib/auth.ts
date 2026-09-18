/** Guards the ingest and export endpoints with a shared bearer token. */
export function isAuthorizedIngest(request: Request) {
  const expected = process.env.INGEST_TOKEN?.trim();

  if (!expected) {
    return false;
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (provided.length !== expected.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  }

  return mismatch === 0;
}
