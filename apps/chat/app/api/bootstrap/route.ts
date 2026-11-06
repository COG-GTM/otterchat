import { NextResponse } from "next/server";
import { listChatsPageByUser } from "@/lib/db/queries";
import { favoriteChats } from "@/lib/flags";
import { getServerViewer } from "@/lib/session";
import { getSetupStatus } from "@/lib/setup";

export async function GET() {
  const setupStatus = await getSetupStatus();
  const viewer = await getServerViewer(setupStatus);
  const favoritesEnabled = await favoriteChats();
  const initialChatsPage =
    viewer && setupStatus.appReady && setupStatus.storageMode === "database"
      ? await listChatsPageByUser(viewer.id, null, { includeFavorites: favoritesEnabled })
      : { items: [], nextCursor: null };

  return NextResponse.json({
    chats: initialChatsPage.items,
    favoritesEnabled,
    nextCursor: initialChatsPage.nextCursor,
    setupStatus,
    viewer,
  });
}
