import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldShowFavoriteToggle } from "../components/chat/favorite-toggle.ts";

const viewer = {
  email: "otter@example.com",
  id: "user-1",
  image: null,
  name: "Otter",
};

describe("shouldShowFavoriteToggle", () => {
  it("hides the favorite star for signed-out viewers when favorite-chats-gol-211 is on (OTTERCHAT-G)", () => {
    assert.equal(shouldShowFavoriteToggle({ favoritesEnabled: true, viewer: null }), false);
  });

  it("shows the favorite star for signed-in viewers when favorite-chats-gol-211 is on", () => {
    assert.equal(shouldShowFavoriteToggle({ favoritesEnabled: true, viewer }), true);
  });

  it("hides the favorite star for signed-out viewers when favorite-chats-gol-211 is off", () => {
    assert.equal(shouldShowFavoriteToggle({ favoritesEnabled: false, viewer: null }), false);
  });

  it("hides the favorite star for signed-in viewers when favorite-chats-gol-211 is off", () => {
    assert.equal(shouldShowFavoriteToggle({ favoritesEnabled: false, viewer }), false);
  });
});
