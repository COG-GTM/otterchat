import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createAccessProof } from "flags";
import { NextRequest } from "next/server";
import { GET } from "../app/.well-known/vercel/flags/route";

const url = "http://localhost:3000/.well-known/vercel/flags";
const secret = "dGVzdC1zZWNyZXQtMzItYnl0ZXMtbG9uZy0xMjM0NTY";
const originalSecret = process.env.FLAGS_SECRET;

function request(authorization?: string) {
  return new NextRequest(url, { headers: authorization ? { authorization } : {} });
}

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.FLAGS_SECRET;
  } else {
    process.env.FLAGS_SECRET = originalSecret;
  }
});

describe("GET /.well-known/vercel/flags without FLAGS_SECRET", () => {
  it("returns 401 instead of throwing when the toolbar sends an Authorization header", async () => {
    delete process.env.FLAGS_SECRET;
    const response = await GET(request("Bearer toolbar-access-proof"));
    assert.equal(response.status, 401);
    assert.equal(await response.json(), null);
  });

  it("returns 401 when no Authorization header is sent", async () => {
    delete process.env.FLAGS_SECRET;
    const response = await GET(request());
    assert.equal(response.status, 401);
  });
});

describe("GET /.well-known/vercel/flags with FLAGS_SECRET", () => {
  it("returns 401 for a missing Authorization header", async () => {
    process.env.FLAGS_SECRET = secret;
    const response = await GET(request());
    assert.equal(response.status, 401);
  });

  it("returns 401 for an invalid access proof", async () => {
    process.env.FLAGS_SECRET = secret;
    const response = await GET(request("Bearer not-a-valid-proof"));
    assert.equal(response.status, 401);
  });

  it("returns provider data for a valid access proof", async () => {
    process.env.FLAGS_SECRET = secret;
    const response = await GET(request(`Bearer ${await createAccessProof(secret)}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = (await response.json()) as { definitions: Record<string, unknown> };
    assert.deepEqual(body.definitions, {});
  });
});
