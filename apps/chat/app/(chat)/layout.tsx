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
  const initialChatsPage =
    viewer && appReady && setupStatus.storageMode === "database"
      ? await listChatsPageByUser(viewer.id)
      : { items: [], nextCursor: null };
  let favoritesEnabled =
    appReady && setupStatus.storageMode === "database" && (await favoriteChats());
  let favorites: Awaited<ReturnType<typeof listFavoriteChatsByUser>> = [];

  if (favoritesEnabled && viewer) {
    try {
      favorites = await listFavoriteChatsByUser(viewer.id);
    } catch {
      // chat_favorite missing (migration 0003 not applied): keep the existing sidebar working.
      favoritesEnabled = false;
    }
  }

  return (
    <AgentChatBootstrapSync
      chats={initialChatsPage.items}
      favorites={favorites}
      favoritesEnabled={favoritesEnabled}
      nextCursor={initialChatsPage.nextCursor}
      setupStatus={setupStatus}
      viewer={viewer}
    />
  );
}
