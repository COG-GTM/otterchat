import * as Sentry from "@sentry/nextjs";

import { isSentryEnabled } from "./lib/sentry-enabled";

Sentry.init({
  enabled: isSentryEnabled(
    process.env.VERCEL_ENV,
    process.env.SENTRY_ENABLE_LOCAL,
  ),
  dsn: "https://9df79a8913b18cd5ddb5231815c36993@o4511033686687744.ingest.us.sentry.io/4512243762528256",
  environment: process.env.VERCEL_ENV ?? "development",
  tracesSampleRate: 1,
  enableLogs: true,
  dataCollection: {},
});
