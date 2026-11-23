import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { request } from "@playwright/test";

// Per-checkout, gitignored, and outside test-results/ (which CI uploads as an artifact on failure).
export const bypassStatePath = fileURLToPath(new URL("../.auth/vercel-bypass.json", import.meta.url));

// The bypass secret is only ever sent to an explicit https Vercel preview URL.
export function vercelBypassTarget() {
  const url = process.env.PLAYWRIGHT_BASE_URL;
  if (!process.env.VERCEL_AUTOMATION_BYPASS_SECRET || !url) return undefined;
  const { protocol, hostname } = new URL(url);
  return protocol === "https:" && /\.(cognitiongtm\.app|vercel\.app)$/.test(hostname) ? url : undefined;
}

// Exchanges the Vercel automation bypass secret for a cookie scoped to the preview host, so the
// browser never sends the secret itself (e.g. to third-party resources the page loads).
export default async function globalSetup() {
  const target = vercelBypassTarget();
  if (!target) return;

  const context = await request.newContext({
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET!,
      "x-vercel-set-bypass-cookie": "true",
    },
  });
  try {
    let status: number;
    try {
      status = (await context.get(target, { maxRedirects: 0 })).status();
    } catch {
      // Playwright's error includes the request headers, which would leak the secret into reports.
      throw new Error(`Vercel bypass request to ${target} failed`);
    }
    const state = await context.storageState();
    if (!state.cookies.some((cookie) => cookie.name === "_vercel_jwt")) {
      throw new Error(`Vercel bypass failed for ${target}: HTTP ${status}, no bypass cookie`);
    }
    await mkdir(dirname(bypassStatePath), { recursive: true, mode: 0o700 });
    await writeFile(bypassStatePath, JSON.stringify(state), { mode: 0o600 });
  } finally {
    await context.dispose();
  }

  return () => rm(bypassStatePath, { force: true });
}
