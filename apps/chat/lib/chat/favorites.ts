import type { StorageMode } from "./types.ts";

// Favorites are stored per user, so the star is only useful to a signed-in viewer.
export function shouldShowFavoriteToggle({
  flagEnabled,
  storageMode,
  viewerId,
}: {
  readonly flagEnabled: boolean;
  readonly storageMode: StorageMode;
  readonly viewerId: string | null | undefined;
}): boolean {
  return flagEnabled && storageMode === "database" && Boolean(viewerId);
}
