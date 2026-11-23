import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./e2e",
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    channel: process.env.PLAYWRIGHT_CHANNEL,
    // Lets the tests through Vercel Deployment Protection on preview deployments.
    extraHTTPHeaders: bypassSecret
      ? { "x-vercel-protection-bypass": bypassSecret, "x-vercel-set-bypass-cookie": "true" }
      : undefined,
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm dev --hostname 127.0.0.1",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
