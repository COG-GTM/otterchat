// The Sentry wizard's example route and page exist to smoke-test error
// reporting. They always error by design, so keep them out of Vercel
// production where anyone could trigger alerts; preview and local dev keep them.
export function isSentryExampleEnabled(vercelEnv: string | undefined): boolean {
  return vercelEnv !== "production";
}

export class SentryExampleAPIError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "SentryExampleAPIError";
  }
}

export function sentryExampleApiResponse(
  vercelEnv: string | undefined,
  log: (message: string) => void = () => {},
): Response {
  if (!isSentryExampleEnabled(vercelEnv)) {
    return new Response(null, { status: 404 });
  }
  log("Sentry example API called");
  throw new SentryExampleAPIError(
    "This error is raised on the backend called by the example page.",
  );
}
