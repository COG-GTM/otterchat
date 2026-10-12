import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SetupStatus, Viewer } from "@/lib/chat/types";

const cookieStore = {
  delete: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
};

const getSetupStatus = vi.fn<() => Promise<SetupStatus>>();
const getServerViewer = vi.fn<(status?: SetupStatus) => Promise<Viewer | null>>();

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("@/lib/setup", () => ({ getSetupStatus: () => getSetupStatus() }));
vi.mock("@/lib/session", () => ({
  getServerViewer: (status?: SetupStatus) => getServerViewer(status),
}));
vi.mock("@/lib/db/queries", () => ({ importChat: vi.fn() }));
const anonStartTypedResult = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/flags", () => ({
  anonStartTypedResult: () => anonStartTypedResult(),
}));

const { startAnonymousChatAction } = await import("./anon");

function setupStatus(overrides: Partial<SetupStatus>): SetupStatus {
  return {
    appReady: true,
    authMode: "neon",
    authReady: true,
    databaseConfigured: true,
    databaseReady: true,
    databaseSchemaReady: true,
    missing: [],
    storageMode: "database",
    ...overrides,
  };
}

describe("startAnonymousChatAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEON_AUTH_COOKIE_SECRET = "test-secret";
    cookieStore.get.mockReturnValue(undefined);
    getServerViewer.mockResolvedValue(null);
    anonStartTypedResult.mockResolvedValue(true);
  });

  it("returns a sign-in result instead of throwing when the app is not ready (OTTERCHAT-6)", async () => {
    getSetupStatus.mockResolvedValue(
      setupStatus({
        appReady: false,
        authMode: "local-dev",
        authReady: false,
        databaseConfigured: false,
        databaseReady: false,
        databaseSchemaReady: false,
        missing: ["DATABASE_URL and Neon Auth configuration"],
        storageMode: "browser",
      }),
    );

    await expect(startAnonymousChatAction()).resolves.toEqual({
      ok: false,
      error: "Sign in to continue.",
    });
    expect(getServerViewer).not.toHaveBeenCalled();
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("returns a sign-in result when neon is configured but migrations are missing", async () => {
    getSetupStatus.mockResolvedValue(
      setupStatus({
        appReady: false,
        databaseReady: false,
        databaseSchemaReady: false,
        missing: ["database migrations"],
      }),
    );

    await expect(startAnonymousChatAction()).resolves.toEqual({
      ok: false,
      error: "Sign in to continue.",
    });
  });

  it("returns a sign-in result in ready local-dev mode, which has no anonymous sessions", async () => {
    getSetupStatus.mockResolvedValue(
      setupStatus({ authMode: "local-dev", storageMode: "browser" }),
    );

    await expect(startAnonymousChatAction()).resolves.toEqual({
      ok: false,
      error: "Sign in to continue.",
    });
  });

  it("returns ok without a cookie when a viewer is signed in", async () => {
    getSetupStatus.mockResolvedValue(setupStatus({}));
    getServerViewer.mockResolvedValue({
      email: "otter@example.com",
      id: "user-1",
      image: null,
      name: "Otter",
    });

    await expect(startAnonymousChatAction()).resolves.toEqual({ ok: true });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("sets an anonymous session cookie for a signed-out visitor when neon is ready", async () => {
    getSetupStatus.mockResolvedValue(setupStatus({}));

    await expect(startAnonymousChatAction()).resolves.toEqual({ ok: true });
    expect(cookieStore.set).toHaveBeenCalledWith(
      "eve_anon_session",
      expect.stringMatching(/^anon-v1\./),
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
  });

  it("keeps throwing the previous error when anon-start-typed-result is off", async () => {
    anonStartTypedResult.mockResolvedValue(false);
    getSetupStatus.mockResolvedValue(
      setupStatus({ appReady: false, authMode: "local-dev", storageMode: "browser" }),
    );

    await expect(startAnonymousChatAction()).rejects.toThrow("Sign in to continue.");
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("does not evaluate the flag on the happy path", async () => {
    getSetupStatus.mockResolvedValue(setupStatus({}));

    await expect(startAnonymousChatAction()).resolves.toEqual({ ok: true });
    expect(anonStartTypedResult).not.toHaveBeenCalled();
  });
});
