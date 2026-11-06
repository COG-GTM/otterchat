import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { shouldShowFavorites } from "../lib/chat/favorites.ts";

describe("shouldShowFavorites", () => {
  it("hides the favorite star for signed-out users even when favorite-chats-gol-274 is on (OTTERCHAT-H)", () => {
    assert.equal(shouldShowFavorites(true, null), false);
    assert.equal(shouldShowFavorites(true, undefined), false);
    assert.equal(shouldShowFavorites(true, ""), false);
  });

  it("shows the favorite star for signed-in users when favorite-chats-gol-274 is on", () => {
    assert.equal(shouldShowFavorites(true, "user_1"), true);
  });

  it("hides the favorite star when favorite-chats-gol-274 is off", () => {
    assert.equal(shouldShowFavorites(false, "user_1"), false);
    assert.equal(shouldShowFavorites(false, null), false);
  });
});

describe("ChatSidebar gates the favorite star on a signed-in viewer", () => {
  const sidebar = readFileSync(
    new URL("../components/chat/sidebar.tsx", import.meta.url),
    "utf8",
  );

  it("enables favorites via shouldShowFavorites(flag, viewerId) instead of the raw flag", () => {
    assert.match(
      sidebar,
      /setFavoritesEnabled\(\s*shouldShowFavorites\(\s*result\.enabled\s*,\s*viewerId\s*\)\s*\)/,
    );
  });

  it("does not render a favorite star that silently no-ops for signed-out users", () => {
    assert.doesNotMatch(sidebar, /DEMO BUG \(intentional\): favorite icon renders for signed-out users/);
  });
});

describe("getFavoriteChatsAction", () => {
  const actions = readFileSync(new URL("../app/actions/chat.ts", import.meta.url), "utf8");

  it("reports favorites as disabled when there is no signed-in viewer", () => {
    const body = actions.slice(actions.indexOf("export async function getFavoriteChatsAction"));
    const fn = body.slice(0, body.indexOf("\n}\n"));
    assert.match(fn, /if \(!viewer\) \{\s*return \{ chats: \[\], enabled: false \};\s*\}/);
  });
});
