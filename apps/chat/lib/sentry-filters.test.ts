import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ErrorEvent } from "@sentry/nextjs";
import { beforeSend } from "./sentry-filters.ts";

const SENTRY_HELPERS_FRAME = {
  filename: "../node_modules/@sentry/browser/src/helpers.ts",
  function: "HTMLDocument.sentryWrapped",
  in_app: false,
};

function getItemTypeError(frames: Array<Record<string, unknown>>): ErrorEvent {
  return {
    type: undefined,
    level: "error",
    exception: {
      values: [
        {
          type: "TypeError",
          value: "Cannot read properties of null (reading 'getItem')",
          mechanism: {
            type: "auto.browser.browserapierrors.addEventListener",
            handled: false,
            data: { handler: "<anonymous>", target: "EventTarget" },
          },
          stacktrace: { frames },
        },
      ],
    },
  };
}

describe("sentry beforeSend", () => {
  test("drops pagehide sessionStorage TypeError thrown by Vercel Live feedback script (OTTERCHAT-C)", () => {
    const event = getItemTypeError([
      SENTRY_HELPERS_FRAME,
      {
        filename: "app:///_next-live/feedback/instrument.729df652a0d7d89d4229.js",
        abs_path: "app:///_next-live/feedback/instrument.729df652a0d7d89d4229.js",
        function: "<anonymous>",
        lineno: 2,
        colno: 1751776,
        in_app: true,
      },
    ]);
    assert.equal(beforeSend(event), null);
  });

  test("drops the same TypeError when the frame has the raw vercel.live script URL", () => {
    const event = getItemTypeError([
      {
        filename: "https://vercel.live/_next-live/feedback/instrument.600610faf04c903a39ee.js",
        function: "<anonymous>",
        lineno: 2,
        colno: 1751776,
      },
      SENTRY_HELPERS_FRAME,
    ]);
    assert.equal(beforeSend(event), null);
  });

  test("keeps an identical getItem TypeError thrown from first-party otterchat chunks", () => {
    const event = getItemTypeError([
      SENTRY_HELPERS_FRAME,
      {
        filename: "app:///_next/static/chunks/app/chat/%5Bid%5D/page-0a1b2c3d.js",
        abs_path: "app:///_next/static/chunks/app/chat/%5Bid%5D/page-0a1b2c3d.js",
        function: "readTheme",
        lineno: 1,
        colno: 4242,
        in_app: true,
      },
    ]);
    assert.equal(beforeSend(event), event);
  });

  test("keeps events without a stacktrace", () => {
    const event: ErrorEvent = {
      type: undefined,
      message: "Cannot read properties of null (reading 'getItem')",
      exception: { values: [{ type: "TypeError", value: "boom" }] },
    };
    assert.equal(beforeSend(event), event);
    const bare: ErrorEvent = { type: undefined, message: "plain message" };
    assert.equal(beforeSend(bare), bare);
  });
});
