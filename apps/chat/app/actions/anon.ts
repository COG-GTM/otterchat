"use server";

import { cookies, headers } from "next/headers";
import type { HandleMessageStreamEvent, SessionState } from "eve/client";
import {
  ANON_SESSION_COOKIE_NAME,
  ANON_SESSION_MAX_AGE,
  createAnonSessionToken,
  verifyAnonSessionToken,
} from "@/lib/anon-session";
import { importChat } from "@/lib/db/queries";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getServerViewer } from "@/lib/session";
import { getSetupStatus } from "@/lib/setup";

const ANON_START_LIMIT = 10;
const ANON_START_WINDOW_SECONDS = 60 * 60;
const CLAIM_LIMIT = 5;
const CLAIM_WINDOW_SECONDS = 60 * 60;
const CLAIM_MAX_EVENTS = 2_000;

export async function startAnonymousChatAction() {
  const setupStatus = await getSetupStatus();

  if (!setupStatus.appReady || setupStatus.authMode !== "neon") {
    throw new Error("Sign in to continue.");
  }

  const viewer = await getServerViewer(setupStatus);

  if (viewer) {
    return { ok: true as const };
  }

  const cookieStore = await cookies();
  const existingAnonId = verifyAnonSessionToken(
    cookieStore.get(ANON_SESSION_COOKIE_NAME)?.value,
  );

  if (existingAnonId) {
    return { ok: true as const };
  }

  const requestHeaders = await headers();
  const clientIp =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  await enforceRateLimit({
    key: clientIp,
    limit: ANON_START_LIMIT,
    prefix: "anon:start",
    windowSeconds: ANON_START_WINDOW_SECONDS,
  });

  cookieStore.set(
    ANON_SESSION_COOKIE_NAME,
    createAnonSessionToken(crypto.randomUUID()),
    {
      httpOnly: true,
      maxAge: ANON_SESSION_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );

  return { ok: true as const };
}

export async function claimAnonChatAction(input: {
  readonly events: readonly HandleMessageStreamEvent[];
  readonly session: SessionState;
  readonly title: string;
}) {
  const setupStatus = await getSetupStatus();

  if (setupStatus.storageMode !== "database") {
    throw new Error("Database persistence is not enabled.");
  }

  const viewer = await getServerViewer(setupStatus);

  if (!viewer) {
    throw new Error("Sign in to continue.");
  }

  if (input.events.length > CLAIM_MAX_EVENTS) {
    throw new Error("Chat is too large to claim.");
  }

  await enforceRateLimit({
    key: viewer.id,
    limit: CLAIM_LIMIT,
    prefix: "chat:claim",
    windowSeconds: CLAIM_WINDOW_SECONDS,
  });

  const claimed = await importChat(viewer.id, {
    events: input.events,
    session: input.session,
    title: input.title,
  });

  const cookieStore = await cookies();
  cookieStore.delete(ANON_SESSION_COOKIE_NAME);

  return claimed;
}
