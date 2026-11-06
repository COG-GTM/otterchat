// Favorites are stored per user, so the star is only shown to signed-in viewers.
export function shouldShowFavorites(
  favoritesEnabled: boolean,
  viewerId: string | null | undefined,
): boolean {
  return favoritesEnabled && Boolean(viewerId);
}
