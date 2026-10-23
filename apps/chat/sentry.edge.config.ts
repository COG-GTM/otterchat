import * as Sentry from "@sentry/nextjs";

import { isSentryEnabled } from "./lib/sentry-enabled";

Sentry.init({
  enabled: isSentryEnabled(process.env.VERCEL_ENV, process.env.SENTRY_ENABLED),
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? "development",
  tracesSampleRate: 1,
  enableLogs: true,
  dataCollection: {},
});
