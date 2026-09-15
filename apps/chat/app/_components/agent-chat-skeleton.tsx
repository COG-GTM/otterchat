import {
  ArrowUpIcon,
  MenuIcon,
  MoonIcon,
  PanelLeftIcon,
  PlusIcon,
  SunIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";


export function AgentChatSkeleton({ mode }: { readonly mode: "chat" | "new" }) {
  const isNew = mode === "new";

  return (
    <div
      aria-busy="true"
      aria-label="Loading chat"
      className="flex h-dvh overflow-hidden bg-background pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] text-foreground"
      role="status"
    >
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-background md:flex">
        <div className="flex flex-col gap-1 px-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2">
          <div className="flex items-center justify-between">
            <div className="flex h-8 items-center gap-2 rounded-md px-1.5">
              <img
                alt=""
                className="size-5 select-none"
                draggable={false}
                src="/logo.svg"
              />
              <span className="text-[13px] font-semibold text-foreground">otterchat</span>
            </div>
            <div className="flex size-8 items-center justify-center rounded-md text-muted-foreground/55">
              <PanelLeftIcon className="size-4" />
            </div>
          </div>
          <div
            className={cn(
              "flex h-8 items-center gap-2 rounded-[8px] px-2 text-xs font-medium text-primary",
              isNew ? "bg-primary/20" : "bg-primary/10",
            )}
          >
            <PlusIcon className="size-4" />
            New session
          </div>
        </div>

        <div className="flex-1 overflow-y-hidden px-2 py-2">
          {isNew ? null : (
            <div>
              <p className="px-2 pt-1 pb-1.5 text-[11px] font-medium text-muted-foreground/80">
                Recents
              </p>
              <div className="space-y-0.5">
                <div className="h-8 rounded-[8px] bg-muted/50" />
                <div className="h-8 rounded-[8px] bg-muted/25" />
                <div className="h-8 rounded-[8px] bg-muted/20" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border px-2 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <div className="h-8 rounded-md bg-muted/25" />
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between px-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 md:px-3">
          <div className="pointer-events-auto flex items-center gap-1">
            <div className="flex size-8 items-center justify-center rounded-md text-muted-foreground md:hidden">
              <MenuIcon className="size-4" />
            </div>
          </div>
          <div className="pointer-events-auto flex items-center justify-end gap-1.5">
            <div className="flex size-8 items-center justify-center rounded-md text-muted-foreground">
              <MoonIcon className="size-4 dark:hidden" />
              <SunIcon className="hidden size-4 dark:block" />
            </div>
            <div className="hidden h-8 w-16 rounded-md bg-muted/30 sm:block" />
            <div className="hidden h-8 w-16 rounded-md bg-muted/50 sm:block" />
          </div>
        </div>

        <AgentChatContentSkeleton mode={mode} />
      </main>
    </div>
  );
}

export function AgentChatContentSkeleton({ mode }: { readonly mode: "chat" | "new" }) {
  return mode === "new" ? <EmptyChatSkeleton /> : <ConversationSkeleton />;
}

function EmptyChatSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col pt-[calc(env(safe-area-inset-top)+3.5rem)] md:pt-[calc(env(safe-area-inset-top)+2rem)]">
      <div className="flex min-h-0 flex-1 items-center justify-center pb-12 sm:pb-[8vh]">
        <div className="w-full max-w-2xl space-y-6 sm:space-y-8 md:space-y-9">
          <h1 className="flex justify-center">
            <img
              alt=""
              className="size-16 select-none sm:size-20 md:size-24"
              draggable={false}
              src="/logo.svg"
            />
          </h1>
          <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
            <StaticComposerFallback />
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <>
      <div className="shrink-0 border-b border-border/70 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 pr-16 pl-12 md:pr-28 md:pl-4">
        <div className="h-6 w-48 max-w-[50vw] rounded-md bg-muted/35" />
      </div>
      <div className="flex-1 px-4 py-10 sm:px-6">
        <div className="mx-auto flex w-full max-w-2xl animate-pulse flex-col gap-8">
          <div className="space-y-3">
            <div className="h-4 w-36 rounded-md bg-muted/30" />
            <div className="h-5 w-72 max-w-[70vw] rounded-md bg-muted/45" />
          </div>
          <div className="ml-auto h-8 w-20 rounded-md bg-muted/35" />
          <div className="space-y-3">
            <div className="h-4 w-32 rounded-md bg-muted/30" />
            <div className="h-5 w-[28rem] max-w-[78vw] rounded-md bg-muted/45" />
            <div className="h-5 w-80 max-w-[64vw] rounded-md bg-muted/35" />
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6 sm:pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <StaticComposerFallback />
      </div>
    </>
  );
}

function StaticComposerFallback() {
  return (
    <div
      className="min-w-0 rounded-[14px] border border-border/80 bg-card/95 shadow-sm dark:bg-muted/45"
      data-chat-composer
    >
      <div className="min-h-12 px-3 pt-3 pb-1 text-[15px] leading-6 text-muted-foreground/45 sm:px-4 dark:text-muted-foreground/60">
        Ask anything...
      </div>
      <div className="flex min-h-9 items-center justify-between gap-2 px-3 pt-1 pb-2 sm:gap-3 sm:px-4">
        <div className="-ml-2 flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden" />
        <div className="flex shrink-0 items-center">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/55 text-primary-foreground">
            <ArrowUpIcon className="size-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
