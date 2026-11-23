import { tmpdir } from "node:os";
import { join } from "node:path";
import { request, type FullConfig } from "@playwright/test";

// Kept outside test-results/, which CI uploads as an artifact on failure.
export const bypassStatePath = join(tmpdir(), "otterchat-vercel-bypass-state.json");

// Exchanges the Vercel automation bypass secret for a cookie scoped to the preview host, so the
// browser never sends the secret itself (e.g. to third-party resources the page loads).
export default async function globalSetup(config: FullConfig) {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const { baseURL } = config.projects[0].use;
  if (!secret || !baseURL) return;

  const context = await request.newContext({
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    },
  });
  const response = await context.get(baseURL, { maxRedirects: 0 });
  const { cookies } = await context.storageState({ path: bypassStatePath });
  if (!cookies.some((cookie) => cookie.name === "_vercel_jwt")) {
    throw new Error(`Vercel bypass failed for ${baseURL}: HTTP ${response.status()}, no bypass cookie`);
  }
  await context.dispose();
}
