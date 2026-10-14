import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { isSentryEnabled } from "./sentry-enabled.ts";

describe("sentry is disabled for local dev servers so auth-guard rejections do not alert production", () => {
  it("is disabled when VERCEL_ENV is unset (local next dev / next start, OTTERCHAT-6)", () => {
    assert.equal(isSentryEnabled(undefined, undefined), false);
  });

  it("is disabled when VERCEL_ENV=development (vercel env pull / vercel dev)", () => {
    assert.equal(isSentryEnabled("development", undefined), false);
  });

  it("is enabled on Vercel production (VERCEL_ENV=production)", () => {
    assert.equal(isSentryEnabled("production", undefined), true);
  });

  it("is enabled on Vercel preview (VERCEL_ENV=preview)", () => {
    assert.equal(isSentryEnabled("preview", undefined), true);
  });

  it("is enabled locally when the opt-in var is set", () => {
    assert.equal(isSentryEnabled(undefined, "1"), true);
    assert.equal(isSentryEnabled(undefined, "true"), true);
  });

  it("stays disabled locally when the opt-in var is \"0\" or empty", () => {
    assert.equal(isSentryEnabled(undefined, "0"), false);
    assert.equal(isSentryEnabled(undefined, ""), false);
  });

  const initFiles = [
    ["sentry.server.config.ts", "VERCEL_ENV", "SENTRY_ENABLE_LOCAL"],
    ["sentry.edge.config.ts", "VERCEL_ENV", "SENTRY_ENABLE_LOCAL"],
    [
      "instrumentation-client.ts",
      "NEXT_PUBLIC_VERCEL_ENV",
      "NEXT_PUBLIC_SENTRY_ENABLE_LOCAL",
    ],
  ] as const;

  for (const [file, vercelEnv, optIn] of initFiles) {
    it(`${file} gates Sentry.init on isSentryEnabled(${vercelEnv}, ${optIn})`, () => {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      assert.match(
        source,
        new RegExp(
          String.raw`enabled:\s*isSentryEnabled\(\s*process\.env\.${vercelEnv}\s*,\s*process\.env\.${optIn}\s*,?\s*\)`,
        ),
      );
    });
  }
});
