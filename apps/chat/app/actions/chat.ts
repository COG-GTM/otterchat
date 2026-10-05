"use server";

import type { HandleMessageStreamEvent, SessionState } from "eve/client";
import {
  appendChatEvent,
  clearChatPendingMessage,
  createChat,
  deleteChatForUser,
  listChatsByUser,
  listFavoriteChatsByUser,
  markChatPendingMessage,
  saveChatSnapshot,
  saveChatSessionState,
  setChatFavorite,
  skipChatAuthorization,
} from "@/lib/db/queries";
import { assertChatMessageLength } from "@/lib/chat/limits";
import { favoriteChats } from "@/lib/flags";
import { getServerViewer } from "@/lib/session";
import { getSetupStatus } from "@/lib/setup";

export async function createChatAction(input?: { readonly pendingUserMessage?: string }) {
  const viewer = await requireViewer();

  if (input?.pendingUserMessage) {
    assertChatMessageLength(input.pendingUserMessage);
  }

  return createChat(viewer.id, {
    pendingUserMessage: input?.pendingUserMessage,
  });
}

export async function saveChatSnapshotAction(input: {
  readonly chatId: string;
  readonly events: readonly HandleMessageStreamEvent[];
  readonly session: SessionState;
}) {
  const viewer = await requireViewer();

  await saveChatSnapshot({
    chatId: input.chatId,
    events: input.events,
    session: input.session,
    userId: viewer.id,
  });

  return { ok: true };
}

export async function markChatPendingMessageAction(input: {
  readonly chatId: string;
  readonly message: string;
}) {
  const viewer = await requireViewer();

  assertChatMessageLength(input.message);

  return markChatPendingMessage({
    chatId: input.chatId,
    message: input.message,
    userId: viewer.id,
  });
}

export async function clearChatPendingMessageAction(chatId: string) {
  const viewer = await requireViewer();

  await clearChatPendingMessage({
    chatId,
    userId: viewer.id,
  });

  return { ok: true };
}

export async function skipChatAuthorizationAction(input: {
  readonly chatId: string;
  readonly events: readonly HandleMessageStreamEvent[];
  readonly session: SessionState;
}) {
  const viewer = await requireViewer();

  return skipChatAuthorization({
    chatId: input.chatId,
    events: input.events,
    session: input.session,
    userId: viewer.id,
  });
}

export async function appendChatEventAction(input: {
  readonly chatId: string;
  readonly event: HandleMessageStreamEvent;
  readonly eventIndex: number;
}) {
  const viewer = await requireViewer();

  await appendChatEvent({
    chatId: input.chatId,
    event: input.event,
    eventIndex: input.eventIndex,
    userId: viewer.id,
  });

  return { ok: true };
}

export async function saveChatSessionStateAction(input: {
  readonly chatId: string;
  readonly session: SessionState;
}) {
  const viewer = await requireViewer();

  await saveChatSessionState({
    chatId: input.chatId,
    session: input.session,
    userId: viewer.id,
  });

  return { ok: true };
}

export async function deleteChatAction(chatId: string) {
  const viewer = await requireViewer();

  await deleteChatForUser(chatId, viewer.id);

  return listChatsByUser(viewer.id);
}

export async function setChatFavoriteAction(input: {
  readonly chatId: string;
  readonly favorite: boolean;
}) {
  const viewer = await requireViewer();

  if (!(await favoriteChats())) {
    throw new Error("Favorite chats are not enabled.");
  }

  await setChatFavorite({
    chatId: input.chatId,
    favorite: input.favorite,
    userId: viewer.id,
  });

  return listFavoriteChatsByUser(viewer.id);
}

async function requireViewer() {
  const setupStatus = await getSetupStatus();

  if (setupStatus.storageMode !== "database") {
    throw new Error("Database persistence is not enabled.");
  }

  const viewer = await getServerViewer(setupStatus);

  if (!viewer) {
    throw new Error("Sign in to continue.");
  }

  return viewer;
}
