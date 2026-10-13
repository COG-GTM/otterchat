import type { Viewer } from "@/lib/chat/types";

export function shouldShowFavoriteToggle({
  favoritesEnabled,
  viewer,
}: {
  readonly favoritesEnabled: boolean;
  readonly viewer: Viewer | null;
}): boolean {
  return favoritesEnabled && viewer !== null;
}
