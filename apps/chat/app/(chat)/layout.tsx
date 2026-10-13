import { Suspense, type ReactNode } from "react";
import { AgentChatBootstrapSync } from "@/app/_components/agent-chat-bootstrap-sync";
import { AgentChatShell } from "@/app/_components/agent-chat-shell";
import { favoriteChats } from "@/lib/flags";
import { listChatsPageByUser, listFavoriteChatsByUser } from "@/lib/db/queries";
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
  const usesDatabase = Boolean(viewer && appReady && setupStatus.storageMode === "database");
  const initialChatsPage =
    viewer && usesDatabase
      ? await listChatsPageByUser(viewer.id)
      : { items: [], nextCursor: null };
  const favoritesEnabled = await favoriteChats();
  const initialFavoriteChats =
    viewer && usesDatabase && favoritesEnabled ? await listFavoriteChatsByUser(viewer.id) : [];

  return (
    <AgentChatBootstrapSync
      chats={initialChatsPage.items}
      favoriteChats={initialFavoriteChats}
      favoritesEnabled={favoritesEnabled}
      nextCursor={initialChatsPage.nextCursor}
      setupStatus={setupStatus}
      viewer={viewer}
    />
  );
}
