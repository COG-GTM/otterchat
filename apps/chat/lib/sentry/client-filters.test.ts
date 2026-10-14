import { eventFiltersIntegration, type Client, type Event } from "@sentry/core";
import { describe, expect, it } from "vitest";
import { SENTRY_CLIENT_DENY_URLS } from "./client-filters";

const client = { getOptions: () => ({ denyUrls: SENTRY_CLIENT_DENY_URLS }) } as unknown as Client;

function filter(event: Event): Event | null {
  const result = eventFiltersIntegration().processEvent?.(event, {}, client);
  return (result ?? null) as Event | null;
}

function listenerError(message: string, frameFilenames: string[]): Event {
  return {
    exception: {
      values: [
        {
          type: "TypeError",
          value: message,
          mechanism: { type: "auto.browser.browserapierrors.addEventListener", handled: false },
          stacktrace: { frames: frameFilenames.map((filename) => ({ filename, in_app: true })) },
        },
      ],
    },
  };
}

const sentryWrapperFrame = "https://otterchat.example/_next/static/chunks/sentry-helpers.js";

describe("SENTRY_CLIENT_DENY_URLS", () => {
  it("drops the OTTERCHAT-C pagehide error thrown by Vercel's injected feedback script", () => {
    const event = listenerError("Cannot read properties of null (reading 'getItem')", [
      sentryWrapperFrame,
      "https://otterchat-git-devin-gol-209-favorite-star-chats.cognitiongtm.app/_next-live/feedback/instrument.729df652a0d7d89d4229.js",
    ]);

    expect(filter(event)).toBeNull();
  });

  it("drops _next-live frames after Next.js rewrites them to app:///", () => {
    const event = listenerError("Cannot read properties of null (reading 'getItem')", [
      sentryWrapperFrame,
      "app:///_next-live/feedback/instrument.729df652a0d7d89d4229.js",
    ]);

    expect(filter(event)).toBeNull();
  });

  it("keeps errors thrown from first-party Next.js chunks", () => {
    const event = listenerError("Cannot read properties of null (reading 'getItem')", [
      sentryWrapperFrame,
      "https://otterchat.example/_next/static/chunks/app/chat/%5Bid%5D/page.js",
    ]);

    expect(filter(event)).toBe(event);
  });

  it("keeps errors whose stack trace has no frames", () => {
    const event = listenerError("Cannot read properties of null (reading 'getItem')", []);

    expect(filter(event)).toBe(event);
  });

  it("does not treat a /chat route containing 'next-live' as a vendor script", () => {
    expect(SENTRY_CLIENT_DENY_URLS.some((re) => re.test("https://otterchat.example/chat/next-live-demo"))).toBe(false);
  });
});
