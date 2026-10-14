import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ErrorEvent } from "@sentry/nextjs";
import { beforeSend } from "./sentry-filters.ts";

const SENTRY_HELPERS_FRAME = {
  filename: "../node_modules/@sentry/browser/src/helpers.ts",
  function: "HTMLDocument.sentryWrapped",
  in_app: false,
};

const VERCEL_LIVE_RAW_FRAME = {
  filename: "https://vercel.live/_next-live/feedback/instrument.600610faf04c903a39ee.js",
  function: "<anonymous>",
  lineno: 2,
  colno: 1751776,
};

const FIRST_PARTY_FRAME = {
  filename: "app:///_next/static/chunks/app/chat/%5Bid%5D/page-0a1b2c3d.js",
  abs_path: "app:///_next/static/chunks/app/chat/%5Bid%5D/page-0a1b2c3d.js",
  function: "readTheme",
  lineno: 1,
  colno: 4242,
  in_app: true,
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
      SENTRY_HELPERS_FRAME,
      VERCEL_LIVE_RAW_FRAME,
    ]);
    assert.equal(beforeSend(event), null);
  });

  test("keeps an identical getItem TypeError thrown from first-party otterchat chunks", () => {
    const event = getItemTypeError([SENTRY_HELPERS_FRAME, FIRST_PARTY_FRAME]);
    assert.equal(beforeSend(event), event);
  });

  test("drops the Vercel Live error when the Sentry wrapper frame is an unsymbolicated first-party chunk", () => {
    const event = getItemTypeError([
      { filename: "app:///_next/static/chunks/main-app-9f8e7d6c.js", function: "sentryWrapped" },
      VERCEL_LIVE_RAW_FRAME,
    ]);
    assert.equal(beforeSend(event), null);
  });

  test("keeps a first-party error thrown from otterchat code called by the Vercel Live script", () => {
    const event = getItemTypeError([SENTRY_HELPERS_FRAME, VERCEL_LIVE_RAW_FRAME, FIRST_PARTY_FRAME]);
    assert.equal(beforeSend(event), event);
  });

  test("keeps an event whose linked first-party exception sits alongside a Vercel Live exception", () => {
    const vercelLive = getItemTypeError([SENTRY_HELPERS_FRAME, VERCEL_LIVE_RAW_FRAME]).exception!.values![0]!;
    const firstParty = getItemTypeError([SENTRY_HELPERS_FRAME, FIRST_PARTY_FRAME]).exception!.values![0]!;
    const event: ErrorEvent = { type: undefined, exception: { values: [vercelLive, firstParty] } };
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
