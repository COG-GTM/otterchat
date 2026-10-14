import * as Sentry from "@sentry/nextjs";
import { SENTRY_CLIENT_DENY_URLS } from "@/lib/sentry/client-filters";

import { isSentryEnabled } from "./lib/sentry-enabled";

Sentry.init({
  enabled: isSentryEnabled(process.env.NEXT_PUBLIC_VERCEL_ENV, process.env.NEXT_PUBLIC_SENTRY_ENABLED),
  dsn: "https://9df79a8913b18cd5ddb5231815c36993@o4511033686687744.ingest.us.sentry.io/4512243762528256",
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
