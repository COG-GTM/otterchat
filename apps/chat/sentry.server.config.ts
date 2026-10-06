import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://0019f258831250b367748eead361b491@o4511860101414912.ingest.us.sentry.io/4511860118519808",
  environment: process.env.VERCEL_ENV ?? "development",
  tracesSampleRate: 1,
  enableLogs: true,
  dataCollection: {},
});
