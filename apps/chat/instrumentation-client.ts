import * as Sentry from "@sentry/nextjs";

import { isSentryEnabled } from "./lib/sentry-enabled";
import { beforeSend } from "./lib/sentry-filters";

Sentry.init({
  enabled: isSentryEnabled(process.env.NEXT_PUBLIC_VERCEL_ENV, process.env.NEXT_PUBLIC_SENTRY_ENABLED),
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  integrations: [Sentry.replayIntegration()],
  tracesSampleRate: 1,
  enableLogs: true,
  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  dataCollection: {},
  beforeSend,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
