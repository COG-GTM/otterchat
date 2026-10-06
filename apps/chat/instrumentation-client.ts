import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://0019f258831250b367748eead361b491@o4511860101414912.ingest.us.sentry.io/4511860118519808",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  integrations: [Sentry.replayIntegration()],
  tracesSampleRate: 1,
  enableLogs: true,
  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  dataCollection: {},
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
