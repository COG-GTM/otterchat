import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { withEve } from "eve/next";
import createWithVercelToolbar from "@vercel/toolbar/plugins/next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // otterimage cold starts on Modal take ~150s with no stream events
    proxyTimeout: 300_000,
  },
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
