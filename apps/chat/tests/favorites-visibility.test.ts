import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { shouldShowFavorites } from "../lib/chat/favorites.ts";
import type { Viewer } from "../lib/chat/types.ts";

const viewer: Viewer = {
  email: "otter@example.com",
  id: "user_1",
  image: null,
  name: "Otter",
};

describe("shouldShowFavorites", () => {
  it("hides the favorite star for signed-out users even when favorite-chats-gol-211 is on", () => {
    assert.equal(shouldShowFavorites(true, null), false);
  });

  it("shows the favorite star for signed-in users when favorite-chats-gol-211 is on", () => {
    assert.equal(shouldShowFavorites(true, viewer), true);
  });

  it("hides the favorite star for signed-in users when favorite-chats-gol-211 is off", () => {
    assert.equal(shouldShowFavorites(false, viewer), false);
  });

  it("hides the favorite star for signed-out users when favorite-chats-gol-211 is off", () => {
    assert.equal(shouldShowFavorites(false, null), false);
  });
});

describe("AgentChatShell gates the favorite star on a signed-in viewer", () => {
  const source = readFileSync(
    new URL("../app/_components/agent-chat-shell.tsx", import.meta.url),
    "utf8",
  );

  it("passes shouldShowFavorites(flag, viewer) to the sidebar instead of the raw flag", () => {
    assert.match(
      source,
      /import\s*\{\s*shouldShowFavorites\s*\}\s*from\s*["']@\/lib\/chat\/favorites["']/,
    );
    assert.match(
      source,
      /setFavoritesEnabled\(\s*shouldShowFavorites\(\s*incomingFavoritesEnabled\s*,\s*incomingViewer\s*\)\s*\)/,
    );
  });

  it("does not render a favorite star that silently no-ops for signed-out users", () => {
    assert.doesNotMatch(source, /DEMO BUG \(intentional\): favorite icon renders for signed-out users/);
  });
});
