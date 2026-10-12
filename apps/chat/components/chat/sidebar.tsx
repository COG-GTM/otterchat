"use client";

import {
  ArrowRightIcon,
  EllipsisIcon,
  PanelLeftIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  AuthDisplayLoggedIn,
  AuthDisplayLoggedOut,
} from "@/components/auth/auth-display";
import { UserMenu } from "@/components/auth/user-menu";
import { handleFavoriteClick } from "@/components/chat/favorite-click";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ChatListItem, SetupStatus, Viewer } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

const activeRowClass = "bg-primary/20 font-medium text-foreground hover:bg-primary/25";
const inactiveRowClass = "text-muted-foreground hover:bg-muted/50 hover:text-foreground";

let favoriteChatsEnabled = false;
const favoriteChatsFlagListeners = new Set<() => void>();

function subscribeFavoriteChatsFlag(listener: () => void) {
  favoriteChatsFlagListeners.add(listener);
  return () => {
    favoriteChatsFlagListeners.delete(listener);
  };
}

export function FavoriteChatsFlagSync({ enabled }: { readonly enabled: boolean }) {
  useEffect(() => {
    favoriteChatsEnabled = enabled;
    favoriteChatsFlagListeners.forEach((listener) => listener());
  }, [enabled]);

  return null;
}

function useFavoriteChatsEnabled() {
  return useSyncExternalStore(
    subscribeFavoriteChatsFlag,
    () => favoriteChatsEnabled,
    () => false,
  );
}

const FAVORITE_CHATS_STORAGE_PREFIX = "otterchat:favorite-chats:";

function isChatListItem(value: unknown): value is ChatListItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.updatedAt === "string"
  );
}

const EMPTY_FAVORITE_CHATS: readonly ChatListItem[] = [];
const favoriteChatsCache = new Map<string, readonly ChatListItem[]>();
const favoriteChatsListeners = new Set<() => void>();

function notifyFavoriteChats() {
  favoriteChatsListeners.forEach((listener) => listener());
}

function handleFavoriteChatsStorage(event: StorageEvent) {
  if (event.key === null || event.key.startsWith(FAVORITE_CHATS_STORAGE_PREFIX)) {
    favoriteChatsCache.clear();
    notifyFavoriteChats();
  }
}

function subscribeFavoriteChats(listener: () => void) {
  if (!favoriteChatsListeners.size) {
    window.addEventListener("storage", handleFavoriteChatsStorage);
  }

  favoriteChatsListeners.add(listener);
  return () => {
    favoriteChatsListeners.delete(listener);

    if (!favoriteChatsListeners.size) {
      window.removeEventListener("storage", handleFavoriteChatsStorage);
    }
  };
}

function readFavoriteChats(viewerId: string | null): readonly ChatListItem[] {
  if (!viewerId || typeof window === "undefined") {
    return EMPTY_FAVORITE_CHATS;
  }

  const cached = favoriteChatsCache.get(viewerId);

  if (cached) {
    return cached;
  }

  let favorites: readonly ChatListItem[] = EMPTY_FAVORITE_CHATS;

  try {
    const raw = window.localStorage.getItem(FAVORITE_CHATS_STORAGE_PREFIX + viewerId);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    favorites = Array.isArray(parsed) ? parsed.filter(isChatListItem) : EMPTY_FAVORITE_CHATS;
  } catch {}

  favoriteChatsCache.set(viewerId, favorites);
  return favorites;
}

function updateFavoriteChats(
  viewerId: string,
  update: (current: readonly ChatListItem[]) => readonly ChatListItem[],
) {
  const favorites = update(readFavoriteChats(viewerId));
  favoriteChatsCache.set(viewerId, favorites);

  try {
    window.localStorage.setItem(FAVORITE_CHATS_STORAGE_PREFIX + viewerId, JSON.stringify(favorites));
  } catch {}

  notifyFavoriteChats();
}

function useFavoriteChats(viewerId: string | null) {
  const favorites = useSyncExternalStore(
    subscribeFavoriteChats,
    () => readFavoriteChats(viewerId),
    () => EMPTY_FAVORITE_CHATS,
  );

  const toggleFavorite = useCallback(
    (chat: ChatListItem) => {
      if (!viewerId) {
        return;
      }

      updateFavoriteChats(viewerId, (current) =>
        current.some((favorite) => favorite.id === chat.id)
          ? current.filter((favorite) => favorite.id !== chat.id)
          : [chat, ...current],
      );
    },
    [viewerId],
  );

  const removeFavorite = useCallback(
    (chatId: string) => {
      if (!viewerId) {
        return;
      }

      updateFavoriteChats(viewerId, (current) =>
        current.filter((favorite) => favorite.id !== chatId),
      );
    },
    [viewerId],
  );

  return { favorites, removeFavorite, toggleFavorite };
}

export function ChatSidebar({
  activeChatId,
  className,
  chats,
  hasMoreChats = false,
  isLoadingChats = false,
  isLoadingMore = false,
  newSessionDisabledReason,
  onDeleteChat,
  onLoadMoreChats,
  onNavigate,
  onNewChat,
  onSignIn,
  onToggleSidebar,
  setupStatus,
  viewer,
}: {
  readonly activeChatId: string | null;
  readonly className?: string;
  readonly chats: readonly ChatListItem[];
  readonly hasMoreChats?: boolean;
  readonly isLoadingChats?: boolean;
  readonly isLoadingMore?: boolean;
  readonly newSessionDisabledReason?: string;
  readonly onDeleteChat: (chatId: string) => void | Promise<void>;
  readonly onLoadMoreChats?: () => void | Promise<void>;
  readonly onNavigate?: (chatId?: string | null) => void;
  readonly onNewChat: () => void;
  readonly onSignIn?: () => void;
  readonly onToggleSidebar?: () => void;
  readonly setupStatus: SetupStatus;
  readonly viewer: Viewer | null;
}) {
  const authDisabled = !setupStatus.appReady;
  const newSessionActive = activeChatId === null;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const favoritesEnabled = useFavoriteChatsEnabled();
  const { favorites, removeFavorite, toggleFavorite } = useFavoriteChats(viewer?.id ?? null);
  const [deletedChatId, setDeletedChatId] = useState<string | null>(null);
  const chatsById = new Map(chats.map((chat) => [chat.id, chat]));
  const favoriteChats = favoritesEnabled
    ? favorites.map((favorite) => chatsById.get(favorite.id) ?? favorite)
    : [];
  const favoriteIds = new Set(favoriteChats.map((chat) => chat.id));
  const recentChats = favoriteIds.size ? chats.filter((chat) => !favoriteIds.has(chat.id)) : chats;

  const handleToggleFavorite = (chat: ChatListItem) =>
    handleFavoriteClick({
      chat,
      isSignedIn: Boolean(viewer),
      onNavigate: () => onNavigate?.(),
      onSignIn,
      toggleFavorite,
    });

  const handleDeleteChat = async (chatId: string) => {
    await onDeleteChat(chatId);
    setDeletedChatId(chatId);
  };

  useEffect(() => {
    if (deletedChatId && !chats.some((chat) => chat.id === deletedChatId)) {
      removeFavorite(deletedChatId);
    }
  }, [chats, deletedChatId, removeFavorite]);

  const renderChatRow = (chat: ChatListItem) => {
    const active = activeChatId === chat.id;
    const favorited = favoriteIds.has(chat.id);

    return (
      <div
        className={cn(
          "group/session relative mb-0.5 rounded-[8px] transition-colors",
          active ? activeRowClass : inactiveRowClass,
        )}
        key={chat.id}
      >
        <Link
          className={cn(
            "flex h-8 min-w-0 items-center px-2 text-xs",
            favoritesEnabled ? "pr-14" : "pr-8",
          )}
          href={`/chat/${chat.id}`}
          onClick={() => onNavigate?.(chat.id)}
        >
          <span className="block truncate">{chat.title}</span>
          <span className="sr-only">Updated {formatHistoryTime(chat.updatedAt)}</span>
        </Link>
        {favoritesEnabled ? (
          <Button
            aria-label={favorited ? "Unfavorite chat" : "Favorite chat"}
            aria-pressed={favorited}
            className={cn(
              "absolute top-1/2 right-7 -translate-y-1/2 rounded-full transition-opacity focus-visible:opacity-100",
              favorited
                ? "text-amber-500 opacity-100 hover:text-amber-500"
                : "text-muted-foreground opacity-0 hover:text-foreground group-hover/session:opacity-100",
            )}
            onClick={() => handleToggleFavorite(chat)}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <StarIcon className={cn("size-3.5", favorited && "fill-current")} />
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Chat actions"
              className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full border border-border/60 bg-background opacity-0 shadow-xs transition-opacity hover:bg-muted group-hover/session:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <EllipsisIcon className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={2}>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                void handleDeleteChat(chat.id);
              }}
              variant="destructive"
            >
              <Trash2Icon className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !hasMoreChats || !onLoadMoreChats) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore) {
          void onLoadMoreChats();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMoreChats, isLoadingMore, onLoadMoreChats]);

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r border-border bg-background",
        className,
      )}
    >
      <div className="flex flex-col gap-1 px-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2">
        <div className="flex items-center justify-between">
          <button
            aria-label="New session"
            className="flex h-8 items-center gap-2 rounded-[8px] px-1.5 transition-colors hover:bg-muted/60"
            onClick={() => {
              onNewChat();
              onNavigate?.(null);
            }}
            type="button"
          >
            <img
              alt=""
              className="size-5 select-none"
              draggable={false}
              src="/logo.svg"
            />
            <span className="text-[13px] font-semibold text-foreground">otterchat</span>
          </button>
          {onToggleSidebar ? (
            <Button
              aria-label="Close sidebar"
              className="text-muted-foreground/55 hover:text-muted-foreground"
              onClick={onToggleSidebar}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <PanelLeftIcon className="size-4" />
            </Button>
          ) : null}
        </div>
        {newSessionDisabledReason ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div aria-label={newSessionDisabledReason} tabIndex={0}>
                <button
                  className="flex h-8 w-full cursor-not-allowed items-center gap-2 rounded-[8px] bg-primary/10 px-2 text-left text-xs font-medium text-primary/50"
                  disabled
                  type="button"
                >
                  <PlusIcon className="size-4" />
                  New session
                </button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{newSessionDisabledReason}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            className={cn(
              "flex h-8 items-center gap-2 rounded-[8px] px-2 text-left text-xs font-medium text-primary transition-colors",
              newSessionActive ? "bg-primary/20 hover:bg-primary/25" : "bg-primary/10 hover:bg-primary/20",
            )}
            onClick={() => {
              onNewChat();
              onNavigate?.(null);
            }}
            type="button"
          >
            <PlusIcon className="size-4" />
            New session
          </button>
        )}
      </div>

      {favoriteChats.length ? (
        <div className="max-h-48 shrink-0 overflow-y-auto border-b border-border px-2 pt-2 pb-1.5">
          <p className="px-2 pt-1 pb-1.5 text-[11px] font-medium text-muted-foreground/80">
            Favorites
          </p>
          {favoriteChats.map(renderChatRow)}
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {recentChats.length ? (
          <div>
            <p className="px-2 pt-1 pb-1.5 text-[11px] font-medium text-muted-foreground/80">
              Recents
            </p>
            {recentChats.map(renderChatRow)}
          </div>
        ) : null}
        {hasMoreChats ? (
          <div ref={sentinelRef} className="px-2 py-2">
            {isLoadingMore ? (
              <p className="text-xs text-muted-foreground">Loading more...</p>
            ) : (
              <button
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => void onLoadMoreChats?.()}
                type="button"
              >
                Load more
              </button>
            )}
          </div>
        ) : null}
      </div>

      <div className="border-t border-border px-2 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        {viewer ? (
          <UserMenu authMode={setupStatus.authMode} viewer={viewer} />
        ) : isLoadingChats ? (
          <>
            <AuthDisplayLoggedIn>
              <div className="h-8 rounded-md bg-muted/25" />
            </AuthDisplayLoggedIn>
            <AuthDisplayLoggedOut>
              <SidebarSignInButton
                authDisabled={false}
                onNavigate={onNavigate}
                onSignIn={onSignIn}
              />
            </AuthDisplayLoggedOut>
          </>
        ) : (
          <SidebarSignInButton
            authDisabled={authDisabled}
            onNavigate={onNavigate}
            onSignIn={onSignIn}
          />
        )}
      </div>
    </aside>
  );
}

function SidebarSignInButton({
  authDisabled,
  onNavigate,
  onSignIn,
}: {
  readonly authDisabled: boolean;
  readonly onNavigate?: (chatId?: string | null) => void;
  readonly onSignIn?: () => void;
}) {
  return (
    <button
      className="flex h-8 w-full items-center justify-between rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      disabled={authDisabled}
      onClick={() => {
        onSignIn?.();
        onNavigate?.();
      }}
      type="button"
    >
      <span className="min-w-0">Log in</span>
      <ArrowRightIcon className="size-3.5" />
    </button>
  );
}

function formatHistoryTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
