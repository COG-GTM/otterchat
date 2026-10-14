import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { isSentryEnabled } from "../lib/sentry-enabled.ts";

describe("isSentryEnabled", () => {
  it("does not send Sentry events from local dev servers (VERCEL_ENV unset)", () => {
    assert.equal(isSentryEnabled(undefined, undefined), false);
    assert.equal(isSentryEnabled("", ""), false);
  });

  it("does not send Sentry events from `vercel dev` (VERCEL_ENV=development)", () => {
    assert.equal(isSentryEnabled("development", undefined), false);
  });

  it("sends Sentry events from Vercel production deployments (VERCEL_ENV=production)", () => {
    assert.equal(isSentryEnabled("production", undefined), true);
  });

  it("sends Sentry events from Vercel preview deployments (VERCEL_ENV=preview)", () => {
    assert.equal(isSentryEnabled("preview", undefined), true);
  });

  it("sends Sentry events from local dev servers when SENTRY_ENABLED=1 opts in", () => {
    assert.equal(isSentryEnabled(undefined, "1"), true);
    assert.equal(isSentryEnabled(undefined, "true"), true);
  });

  it("stays disabled locally when the opt-in var is set to anything else", () => {
    assert.equal(isSentryEnabled(undefined, "0"), false);
    assert.equal(isSentryEnabled(undefined, "false"), false);
  });
});

describe("Sentry init files gate `enabled` on isSentryEnabled", () => {
  const configs = [
    ["sentry.server.config.ts", "VERCEL_ENV", "SENTRY_ENABLED"],
    ["sentry.edge.config.ts", "VERCEL_ENV", "SENTRY_ENABLED"],
    [
      "instrumentation-client.ts",
      "NEXT_PUBLIC_VERCEL_ENV",
      "NEXT_PUBLIC_SENTRY_ENABLED",
    ],
  ] as const;

  for (const [file, vercelEnvVar, optInVar] of configs) {
    it(`${file} passes isSentryEnabled(${vercelEnvVar}, ${optInVar}) to Sentry.init({ enabled })`, () => {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      assert.match(
        source,
        /import\s*\{\s*isSentryEnabled\s*\}\s*from\s*["'](?:\.\/|@\/)lib\/sentry-enabled["']/,
        `${file} must import isSentryEnabled from lib/sentry-enabled`,
      );
      const enabledCall = new RegExp(
        String.raw`enabled:\s*isSentryEnabled\(\s*process\.env\.${vercelEnvVar}\s*,\s*process\.env\.${optInVar}\s*,?\s*\)`,
      );
      assert.match(
        source,
        enabledCall,
        `${file} must set enabled: isSentryEnabled(process.env.${vercelEnvVar}, process.env.${optInVar})`,
      );
    });
  }
});
