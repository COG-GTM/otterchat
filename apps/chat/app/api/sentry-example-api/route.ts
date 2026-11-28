import * as Sentry from "@sentry/nextjs";
import { connection } from "next/server";

import { sentryExampleApiResponse } from "@/lib/sentry-example";

export async function GET() {
  await connection();
  return sentryExampleApiResponse(process.env.VERCEL_ENV, (message) =>
    Sentry.logger.info(message),
  );
}
