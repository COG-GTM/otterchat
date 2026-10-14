// Sentry only reports from Vercel production/preview deployments, so local and
// test dev servers (including ones with a `vercel env pull`ed VERCEL_ENV of
// "development") don't send events to the production project. Set
// SENTRY_ENABLE_LOCAL=1 (server/edge) or NEXT_PUBLIC_SENTRY_ENABLE_LOCAL=1
// (browser) to opt in while debugging locally.
export function isSentryEnabled(
  vercelEnv: string | undefined,
  localOptIn: string | undefined,
): boolean {
  if (localOptIn === "1" || localOptIn === "true") return true;
  return vercelEnv === "production" || vercelEnv === "preview";
}
