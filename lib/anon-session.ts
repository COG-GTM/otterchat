import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ANON_SESSION_COOKIE_NAME = "eve_anon_session";
export const ANON_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const TOKEN_VERSION = "anon-v1";

export function createAnonSessionToken(anonId: string, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + ANON_SESSION_MAX_AGE;
  const payload = `${TOKEN_VERSION}.${anonId}.${expiresAt}`;

  return `${payload}.${sign(payload)}`;
}

export function verifyAnonSessionToken(
  token: string | undefined,
  now = Date.now(),
): string | null {
  if (!token || !getAnonSessionSecret()) {
    return null;
  }

  const [version, anonId, expiresAtRaw, signature, ...extra] = token.split(".");
  const expiresAt = Number(expiresAtRaw);

  if (
    version !== TOKEN_VERSION ||
    !anonId ||
    !signature ||
    extra.length > 0 ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Math.floor(now / 1000)
  ) {
    return null;
  }

  const expected = sign(`${version}.${anonId}.${expiresAt}`);

  return timingSafeEqual(hash(signature), hash(expected)) ? anonId : null;
}

function getAnonSessionSecret() {
  return process.env.NEON_AUTH_COOKIE_SECRET?.trim() ?? "";
}

function hash(value: string) {
  return createHash("sha256").update(value).digest();
}

function sign(payload: string) {
  return createHmac("sha256", `${TOKEN_VERSION}:${getAnonSessionSecret()}`)
    .update(payload)
    .digest("base64url");
}
