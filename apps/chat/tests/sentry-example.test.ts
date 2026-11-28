import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  isSentryExampleEnabled,
  SentryExampleAPIError,
  sentryExampleApiResponse,
} from "../lib/sentry-example.ts";

describe("sentry example API", () => {
  it("sentry example API returns 404 in Vercel production", () => {
    const logs: string[] = [];
    const response = sentryExampleApiResponse("production", (message) => logs.push(message));
    assert.equal(response.status, 404);
    assert.deepEqual(logs, []);
  });

  it("sentry example API does not throw SentryExampleAPIError in Vercel production", () => {
    assert.doesNotThrow(() => sentryExampleApiResponse("production"));
  });

  it("sentry example API still throws SentryExampleAPIError in Vercel preview", () => {
    assert.throws(() => sentryExampleApiResponse("preview"), SentryExampleAPIError);
  });

  it("sentry example API still throws SentryExampleAPIError in local dev (VERCEL_ENV unset)", () => {
    const logs: string[] = [];
    assert.throws(
      () => sentryExampleApiResponse(undefined, (message) => logs.push(message)),
      (error: unknown) =>
        error instanceof SentryExampleAPIError && error.name === "SentryExampleAPIError",
    );
    assert.deepEqual(logs, ["Sentry example API called"]);
  });

  it("app/api/sentry-example-api/route.ts returns sentryExampleApiResponse(process.env.VERCEL_ENV)", () => {
    const source = readFileSync(
      new URL("../app/api/sentry-example-api/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /return\s+sentryExampleApiResponse\(\s*process\.env\.VERCEL_ENV\b/);
    assert.doesNotMatch(source, /throw\s+new\s+SentryExampleAPIError/);
  });
});

describe("sentry example page", () => {
  it("sentry example page is disabled in Vercel production", () => {
    assert.equal(isSentryExampleEnabled("production"), false);
  });

  it("sentry example page stays enabled in Vercel preview and local dev", () => {
    assert.equal(isSentryExampleEnabled("preview"), true);
    assert.equal(isSentryExampleEnabled("development"), true);
    assert.equal(isSentryExampleEnabled(undefined), true);
  });

  it("app/sentry-example-page/layout.tsx calls notFound() when isSentryExampleEnabled(process.env.VERCEL_ENV) is false", () => {
    const source = readFileSync(
      new URL("../app/sentry-example-page/layout.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /import\s*\{\s*notFound\s*\}\s*from\s*["']next\/navigation["']/);
    assert.match(
      source,
      /if\s*\(\s*!isSentryExampleEnabled\(\s*process\.env\.VERCEL_ENV\s*\)\s*\)\s*notFound\(\)/,
    );
  });
});
