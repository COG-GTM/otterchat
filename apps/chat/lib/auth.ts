import { createNeonAuth } from "@neondatabase/auth/next/server";

const neonAuthBaseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
const neonAuthCookieSecret = process.env.NEON_AUTH_COOKIE_SECRET?.trim();

export const auth = createNeonAuth({
  baseUrl: neonAuthBaseUrl ?? "http://localhost:3000/api/auth-unconfigured",
  cookies: {
    secret: neonAuthCookieSecret ?? "eve-chat-template-unconfigured-secret",
    sameSite: "lax",
  },
});
