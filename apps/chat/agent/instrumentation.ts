import * as Sentry from "@sentry/node";
import { defineInstrumentation } from "eve/instrumentation";
import { isSentryEnabled } from "@/lib/sentry-enabled";

export default defineInstrumentation({
  setup: () => {
    Sentry.init({
      enabled: isSentryEnabled(process.env.VERCEL_ENV, process.env.SENTRY_ENABLED),
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.VERCEL_ENV ?? "development",
    });
  },
});
