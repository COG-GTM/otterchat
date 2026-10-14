import type { Viewer } from "@/lib/chat/types";

// Favorites are stored per user, so the star is only shown to signed-in viewers.
export function shouldShowFavorites(
  favoritesEnabled: boolean,
  viewer: Viewer | null,
): boolean {
  return favoritesEnabled && viewer !== null;
}
