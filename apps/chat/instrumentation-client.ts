import * as Sentry from "@sentry/nextjs";
import { SENTRY_CLIENT_DENY_URLS } from "@/lib/sentry/client-filters";

import { isSentryEnabled } from "./lib/sentry-enabled";

Sentry.init({
  enabled: isSentryEnabled(process.env.NEXT_PUBLIC_VERCEL_ENV, process.env.NEXT_PUBLIC_SENTRY_ENABLED),
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  denyUrls: SENTRY_CLIENT_DENY_URLS,
  integrations: [Sentry.replayIntegration()],
  tracesSampleRate: 1,
  enableLogs: true,
  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  dataCollection: {},
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
