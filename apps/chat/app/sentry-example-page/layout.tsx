import { notFound } from "next/navigation";

import { isSentryExampleEnabled } from "@/lib/sentry-example";

export default function SentryExampleLayout({ children }: LayoutProps<"/sentry-example-page">) {
  if (!isSentryExampleEnabled(process.env.VERCEL_ENV)) notFound();
  return children;
}
