import { describe, expect, it, vi } from "vitest";
import { handleFavoriteClick } from "./favorite-click";

const chat = { id: "396d8f17-d135-4650-b679-d4e5c4f32c97", title: "Chat", updatedAt: "2026-10-12T23:13:33Z" };

describe("handleFavoriteClick", () => {
  it("opens sign-in instead of silently ignoring a signed-out click (OTTERCHAT-7)", () => {
    const onSignIn = vi.fn();
    const onNavigate = vi.fn();
    const toggleFavorite = vi.fn();

    handleFavoriteClick({ chat, isSignedIn: false, onNavigate, onSignIn, toggleFavorite });

    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(toggleFavorite).not.toHaveBeenCalled();
  });

  it("opens sign-in on every repeated signed-out click", () => {
    const onSignIn = vi.fn();
    const toggleFavorite = vi.fn();

    for (let i = 0; i < 5; i++) {
      handleFavoriteClick({ chat, isSignedIn: false, onSignIn, toggleFavorite });
    }

    expect(onSignIn).toHaveBeenCalledTimes(5);
    expect(toggleFavorite).not.toHaveBeenCalled();
  });

  it("does not throw when signed out and no sign-in handler is provided", () => {
    const toggleFavorite = vi.fn();

    expect(() => handleFavoriteClick({ chat, isSignedIn: false, toggleFavorite })).not.toThrow();
    expect(toggleFavorite).not.toHaveBeenCalled();
  });

  it("toggles the favorite for signed-in users without prompting sign-in", () => {
    const onSignIn = vi.fn();
    const onNavigate = vi.fn();
    const toggleFavorite = vi.fn();

    handleFavoriteClick({ chat, isSignedIn: true, onNavigate, onSignIn, toggleFavorite });

    expect(toggleFavorite).toHaveBeenCalledWith(chat);
    expect(onSignIn).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
