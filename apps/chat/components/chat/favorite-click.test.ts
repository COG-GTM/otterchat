import { describe, expect, it, vi } from "vitest";
import { handleFavoriteClick } from "./favorite-click";

const chat = {
  id: "d9654f46-e4cf-4f73-8d4d-d45a165219b7",
  title: "Chat",
  updatedAt: "2026-10-13T19:42:22Z",
};

describe("handleFavoriteClick", () => {
  it("opens sign-in instead of silently ignoring a signed-out click (OTTERCHAT-A)", () => {
    const onSignIn = vi.fn();
    const toggleFavorite = vi.fn();

    handleFavoriteClick({ chat, isSignedIn: false, onSignIn, toggleFavorite });

    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(toggleFavorite).not.toHaveBeenCalled();
  });

  it("responds to every repeated signed-out click", () => {
    const onSignIn = vi.fn();
    const toggleFavorite = vi.fn();

    for (let i = 0; i < 5; i++) {
      handleFavoriteClick({ chat, isSignedIn: false, onSignIn, toggleFavorite });
    }

    expect(onSignIn).toHaveBeenCalledTimes(5);
    expect(toggleFavorite).not.toHaveBeenCalled();
  });

  it("toggles the favorite for signed-in users without prompting sign-in", async () => {
    const onSignIn = vi.fn();
    const toggleFavorite = vi.fn().mockResolvedValue(undefined);

    await handleFavoriteClick({ chat, isSignedIn: true, onSignIn, toggleFavorite });

    expect(toggleFavorite).toHaveBeenCalledWith(chat);
    expect(onSignIn).not.toHaveBeenCalled();
  });
});
