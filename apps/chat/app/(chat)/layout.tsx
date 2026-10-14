import { Suspense, type ReactNode } from "react";
import { AgentChatBootstrapSync } from "@/app/_components/agent-chat-bootstrap-sync";
import { AgentChatShell } from "@/app/_components/agent-chat-shell";
import { listChatsPageByUser, listFavoriteChatsByUser } from "@/lib/db/queries";
import { favoriteChats } from "@/lib/flags";
import { getServerViewer } from "@/lib/session";
import { getInitialSetupStatus, getSetupStatus } from "@/lib/setup";

export default function ChatLayout({ children }: { readonly children: ReactNode }) {
  const setupStatus = getInitialSetupStatus();

  return (
    <AgentChatShell
      initialChats={[]}
      initialNextCursor={null}
      setupStatus={setupStatus}
      viewer={null}
    >
      {children}
      <div className="hidden" aria-hidden>
        <Suspense fallback={null}>
          <ResolvedChatBootstrap />
        </Suspense>
      </div>
    </AgentChatShell>
  );
}

async function ResolvedChatBootstrap() {
  const setupStatus = await getSetupStatus();
  const viewer = await getServerViewer(setupStatus);
  const appReady = setupStatus.appReady;
  const favoritesEnabled = await favoriteChats();
  const usesDatabase = Boolean(viewer && appReady && setupStatus.storageMode === "database");
  const [initialChatsPage, favorites] = usesDatabase && viewer
    ? await Promise.all([
        listChatsPageByUser(viewer.id, null, { includeFavorite: favoritesEnabled }),
        favoritesEnabled ? listFavoriteChatsByUser(viewer.id) : [],
      ])
    : [{ items: [], nextCursor: null }, []];
  const pageIds = new Set(initialChatsPage.items.map((item) => item.id));
  const chats = [
    ...initialChatsPage.items,
    ...favorites.filter((item) => !pageIds.has(item.id)),
  ];

  return (
    <AgentChatBootstrapSync
      chats={chats}
      favoritesEnabled={favoritesEnabled}
      nextCursor={initialChatsPage.nextCursor}
      setupStatus={setupStatus}
      viewer={viewer}
    />
  );
}
