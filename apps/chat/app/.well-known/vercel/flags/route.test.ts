import { randomBytes } from "node:crypto";
import { createAccessProof } from "flags";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const url = "http://localhost:3000/.well-known/vercel/flags";

function request(headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers });
}

describe("GET /.well-known/vercel/flags", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("without FLAGS_SECRET", () => {
    beforeEach(() => {
      vi.stubEnv("FLAGS_SECRET", "");
    });

    it("returns 401 instead of throwing when an Authorization header is sent", async () => {
      const response = await GET(request({ Authorization: "Bearer some-proof" }));

      expect(response.status).toBe(401);
      expect(await response.json()).toBeNull();
    });

    it("returns 401 when no Authorization header is sent", async () => {
      const response = await GET(request());

      expect(response.status).toBe(401);
    });
  });

  describe("with FLAGS_SECRET", () => {
    const secret = randomBytes(32).toString("base64url");

    beforeEach(() => {
      vi.stubEnv("FLAGS_SECRET", secret);
    });

    it("returns 401 when no Authorization header is sent", async () => {
      const response = await GET(request());

      expect(response.status).toBe(401);
    });

    it("returns 401 for an invalid access proof", async () => {
      const response = await GET(request({ Authorization: "Bearer not-a-valid-proof" }));

      expect(response.status).toBe(401);
    });

    it("returns the flag definitions for a valid access proof", async () => {
      const proof = await createAccessProof(secret);
      const response = await GET(request({ Authorization: `Bearer ${proof}` }));

      expect(response.status).toBe(200);
      expect(response.headers.get("x-flags-sdk-version")).toBeTruthy();
      expect(await response.json()).toMatchObject({ definitions: {} });
    });
  });
});
