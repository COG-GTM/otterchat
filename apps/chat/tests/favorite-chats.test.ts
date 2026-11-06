import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { shouldShowFavoriteToggle } from "../lib/chat/favorites.ts";

describe("shouldShowFavoriteToggle", () => {
  it("hides the favorite star for signed-out users even when favorite-chats-gol-274 is on", () => {
    assert.equal(
      shouldShowFavoriteToggle({ flagEnabled: true, storageMode: "database", viewerId: null }),
      false,
    );
    assert.equal(
      shouldShowFavoriteToggle({ flagEnabled: true, storageMode: "database", viewerId: undefined }),
      false,
    );
    assert.equal(
      shouldShowFavoriteToggle({ flagEnabled: true, storageMode: "database", viewerId: "" }),
      false,
    );
  });

  it("shows the favorite star for signed-in users when favorite-chats-gol-274 is on in database mode", () => {
    assert.equal(
      shouldShowFavoriteToggle({ flagEnabled: true, storageMode: "database", viewerId: "user-1" }),
      true,
    );
  });

  it("hides the favorite star when favorite-chats-gol-274 is off, signed in or signed out", () => {
    assert.equal(
      shouldShowFavoriteToggle({ flagEnabled: false, storageMode: "database", viewerId: "user-1" }),
      false,
    );
    assert.equal(
      shouldShowFavoriteToggle({ flagEnabled: false, storageMode: "database", viewerId: null }),
      false,
    );
  });

  it("hides the favorite star in browser (non-database) storage mode even when the flag is on", () => {
    assert.equal(
      shouldShowFavoriteToggle({ flagEnabled: true, storageMode: "browser", viewerId: "user-1" }),
      false,
    );
    assert.equal(
      shouldShowFavoriteToggle({ flagEnabled: true, storageMode: "browser", viewerId: null }),
      false,
    );
  });
});

describe("favorite star wiring uses shouldShowFavoriteToggle", () => {
  const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

  it("getFavoriteChatsAction reports enabled only for a signed-in viewer", () => {
    const source = read("app/actions/chat.ts");
    const action = source.slice(
      source.indexOf("export async function getFavoriteChatsAction"),
      source.indexOf("export async function setChatFavoriteAction"),
    );
    assert.match(action, /shouldShowFavoriteToggle\(\{[^}]*viewerId:\s*viewer\?\.id/);
    assert.doesNotMatch(action, /enabled:\s*true/, "enabled must not be hard-coded to true");
  });

  it("sidebar renders the star (and pr-14 padding) only when a signed-in viewer can favorite", () => {
    const source = read("components/chat/sidebar.tsx");
    assert.match(source, /shouldShowFavoriteToggle\(\{[^}]*viewerId[^}]*\}\)/);
    assert.doesNotMatch(source, /favoritesEnabled \? "pr-14"/);
    assert.doesNotMatch(source, /\{favoritesEnabled \? \(/);
    assert.doesNotMatch(source, /DEMO BUG/);
  });
});
