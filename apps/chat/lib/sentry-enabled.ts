// Only Vercel deployments report to Sentry; local and Devin dev servers would
// otherwise page the shared project. Set SENTRY_ENABLED=1 (server/edge) or
// NEXT_PUBLIC_SENTRY_ENABLED=1 (client) to opt in while debugging locally.
export function isSentryEnabled(
  vercelEnv: string | undefined,
  optIn: string | undefined,
): boolean {
  if (optIn === "1" || optIn === "true") return true;
  return vercelEnv === "production" || vercelEnv === "preview";
}
