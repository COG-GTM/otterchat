import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  isServerActionId,
  isUnresolvableServerActionRequest,
  loadServerActionIds,
} from "./server-action-request";

const KNOWN_ID = "00dcf8000cd0d8ce01a78a6b518817139b425c1822";
const EDGE_ID = "40ccb54cf9578954a684098aba77d34bcd3771dfad";
const STALE_ID = "00aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const KNOWN_IDS = new Set([KNOWN_ID]);

function actionRequest(actionId: string | null, method = "POST") {
  const headers = new Headers({ "content-type": "text/plain;charset=UTF-8" });

  if (actionId !== null) {
    headers.set("Next-Action", actionId);
  }

  return new Request("https://otterchat.test/index", {
    body: method === "GET" ? undefined : "[]",
    headers,
    method,
  });
}

describe("isServerActionId", () => {
  it("accepts ids in the format Next.js emits", () => {
    expect(isServerActionId(KNOWN_ID)).toBe(true);
    expect(isServerActionId(KNOWN_ID.toUpperCase())).toBe(true);
  });

  it.each(["", "x", "deadbeef", `${KNOWN_ID}0`, KNOWN_ID.slice(1), `${KNOWN_ID.slice(0, 41)}g`])(
    "rejects %j",
    (id) => {
      expect(isServerActionId(id)).toBe(false);
    },
  );
});

describe("isUnresolvableServerActionRequest", () => {
  it("flags the OTTERCHAT-3 request shape (POST with a junk Next-Action id)", () => {
    expect(isUnresolvableServerActionRequest(actionRequest("deadbeef"), KNOWN_IDS)).toBe(true);
    expect(isUnresolvableServerActionRequest(actionRequest("x"), KNOWN_IDS)).toBe(true);
  });

  it("flags well-formed ids from another deployment", () => {
    expect(isUnresolvableServerActionRequest(actionRequest(STALE_ID), KNOWN_IDS)).toBe(true);
  });

  it("flags an empty Next-Action header", () => {
    expect(isUnresolvableServerActionRequest(actionRequest(""), KNOWN_IDS)).toBe(true);
  });

  it("lets this build's server actions through", () => {
    expect(isUnresolvableServerActionRequest(actionRequest(KNOWN_ID), KNOWN_IDS)).toBe(false);
    expect(
      isUnresolvableServerActionRequest(actionRequest(KNOWN_ID.toUpperCase()), KNOWN_IDS),
    ).toBe(false);
  });

  it("falls back to format-only checks when the manifest is unavailable", () => {
    expect(isUnresolvableServerActionRequest(actionRequest(STALE_ID), null)).toBe(false);
    expect(isUnresolvableServerActionRequest(actionRequest("deadbeef"), null)).toBe(true);
  });

  it("ignores POSTs without a Next-Action header", () => {
    expect(isUnresolvableServerActionRequest(actionRequest(null), KNOWN_IDS)).toBe(false);
  });

  it("ignores non-POST requests, which Next.js never treats as actions", () => {
    expect(isUnresolvableServerActionRequest(actionRequest("deadbeef", "GET"), KNOWN_IDS)).toBe(
      false,
    );
  });
});

describe("loadServerActionIds", () => {
  let distDir: string | undefined;

  afterEach(() => {
    if (distDir) {
      rmSync(distDir, { force: true, recursive: true });
      distDir = undefined;
    }
  });

  it("collects node and edge action ids from the build manifest", () => {
    distDir = mkdtempSync(path.join(tmpdir(), "otterchat-next-"));
    mkdirSync(path.join(distDir, "server"));
    writeFileSync(
      path.join(distDir, "server", "server-reference-manifest.json"),
      JSON.stringify({ node: { [KNOWN_ID]: {} }, edge: { [EDGE_ID]: {} }, encryptionKey: "k" }),
    );

    expect(loadServerActionIds(distDir)).toEqual(new Set([KNOWN_ID, EDGE_ID]));
  });

  it("returns null when the manifest is missing or unreadable", () => {
    distDir = mkdtempSync(path.join(tmpdir(), "otterchat-next-"));
    expect(loadServerActionIds(distDir)).toBeNull();

    mkdirSync(path.join(distDir, "server"));
    writeFileSync(path.join(distDir, "server", "server-reference-manifest.json"), "{not json");
    expect(loadServerActionIds(distDir)).toBeNull();
  });
});
