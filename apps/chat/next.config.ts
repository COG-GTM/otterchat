import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { withEve } from "eve/next";
import createWithVercelToolbar from "@vercel/toolbar/plugins/next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  turbopack: {
    // dependencies are hoisted to the monorepo root
    root: path.join(import.meta.dirname, "..", ".."),
  },
};

const withVercelToolbar = createWithVercelToolbar();

export default withSentryConfig(withEve(withVercelToolbar(nextConfig)), {
  org: "devin-gtm",
  project: "otterchat",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: true,
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
