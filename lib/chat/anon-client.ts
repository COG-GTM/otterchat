"use client";

const ANON_CHAT_STORAGE_KEY = "eve-chat-template:anon-chat-id";

export const ANON_LIMIT_REACHED_REASON =
  "You've used your free session. Sign in to start a new one.";

export function getStoredAnonChatId() {
  try {
    return localStorage.getItem(ANON_CHAT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeAnonChatId(chatId: string) {
  try {
    localStorage.setItem(ANON_CHAT_STORAGE_KEY, chatId);
  } catch {}
}

export function clearStoredAnonChatId() {
  try {
    localStorage.removeItem(ANON_CHAT_STORAGE_KEY);
  } catch {}
}
