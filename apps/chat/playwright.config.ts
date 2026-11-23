import { defineConfig, devices } from "@playwright/test";
import { bypassStatePath } from "./e2e/global-setup";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    channel: process.env.PLAYWRIGHT_CHANNEL,
    storageState: process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? bypassStatePath : undefined,
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
