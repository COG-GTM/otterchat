"use server";

import { cookies } from "next/headers";
import type { HandleMessageStreamEvent, SessionState } from "eve/client";
import {
  ANON_SESSION_COOKIE_NAME,
  ANON_SESSION_MAX_AGE,
  createAnonSessionToken,
  verifyAnonSessionToken,
} from "@/lib/anon-session";
import { importChat } from "@/lib/db/queries";
import { anonStartTypedResult } from "@/lib/flags";
import { getServerViewer } from "@/lib/session";
import { getSetupStatus } from "@/lib/setup";

const CLAIM_MAX_EVENTS = 2_000;
const SIGN_IN_REQUIRED = "Sign in to continue.";

export type StartAnonymousChatResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

export async function startAnonymousChatAction(): Promise<StartAnonymousChatResult> {
  const setupStatus = await getSetupStatus();

  // Returning (not throwing) keeps this expected refusal out of Sentry and
  // preserves the message in production builds.
  if (!setupStatus.appReady || setupStatus.authMode !== "neon") {
    if (await anonStartTypedResult().catch(() => false)) {
      return { ok: false as const, error: SIGN_IN_REQUIRED };
    }

    throw new Error(SIGN_IN_REQUIRED);
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

  const claimed = await importChat(viewer.id, {
    events: input.events,
    session: input.session,
    title: input.title,
  });

  const cookieStore = await cookies();
  cookieStore.delete(ANON_SESSION_COOKIE_NAME);

  return claimed;
}
