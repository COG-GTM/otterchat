import { createAccessProof } from "flags";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const url = "http://localhost:3000/.well-known/vercel/flags";
const secret = "dGVzdC1zZWNyZXQtMzItYnl0ZXMtbG9uZy0xMjM0NTY";

function request(authorization?: string) {
  return new NextRequest(url, { headers: authorization ? { authorization } : {} });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /.well-known/vercel/flags", () => {
  describe("without FLAGS_SECRET", () => {
    it("returns 401 instead of throwing when an Authorization header is sent", async () => {
      vi.stubEnv("FLAGS_SECRET", "");
      const response = await GET(request("Bearer some-token"));
      expect(response.status).toBe(401);
      expect(await response.json()).toBeNull();
    });

    it("returns 401 when no Authorization header is sent", async () => {
      vi.stubEnv("FLAGS_SECRET", "");
      const response = await GET(request());
      expect(response.status).toBe(401);
    });
  });

  describe("with FLAGS_SECRET", () => {
    it("returns 401 for a missing Authorization header", async () => {
      vi.stubEnv("FLAGS_SECRET", secret);
      const response = await GET(request());
      expect(response.status).toBe(401);
    });

    it("returns 401 for an invalid access proof", async () => {
      vi.stubEnv("FLAGS_SECRET", secret);
      const response = await GET(request("Bearer not-a-valid-proof"));
      expect(response.status).toBe(401);
    });

    it("returns provider data for a valid access proof", async () => {
      vi.stubEnv("FLAGS_SECRET", secret);
      const proof = await createAccessProof(secret);
      const response = await GET(request(`Bearer ${proof}`));
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toMatchObject({ definitions: {} });
    });
  });
});
