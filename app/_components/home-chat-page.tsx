"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ComposerFooterControls,
  ErrorToast,
  type AgentChatControllerStatus,
} from "@/app/_components/agent-chat";
import { useChatShell } from "@/app/_components/chat-shell-context";
import { startAnonymousChatAction } from "@/app/actions/anon";
import { ChatComposer } from "@/components/chat/composer";
import MarqueePromptsDemo from "@/components/shadcn-space/marquee/marquee-02";
import { ANON_LIMIT_REACHED_REASON } from "@/lib/chat/anon-client";
import { getChatMessageLengthError } from "@/lib/chat/limits";
import {
  createProvisionalChatId,
  writePendingChatMessage,
} from "@/lib/chat/provisional-chat";
import type { SetupStatus } from "@/lib/chat/types";

const IDLE_CONTROLLER_STATUS: AgentChatControllerStatus = {
  isBusy: false,
  isDisabled: false,
  isEmpty: true,
};

export function HomeChatPage() {
  const {
    anonChatId,
    bootstrapped,
    requestSignIn,
    setActiveChatId,
    setupStatus,
    viewer,
  } = useChatShell();
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const setupReady = setupStatus.appReady;
  const pathname = usePathname();
  const router = useRouter();
  const toastError = clientError && dismissedError !== clientError ? clientError : null;

  useEffect(() => {
    setActiveChatId(null);
  }, [setActiveChatId]);

  useEffect(() => {
    if (pathname === "/") {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!viewer) {
      return;
    }

    const restoredDraft = window.sessionStorage.getItem("eve-chat-draft");

    if (restoredDraft) {
      setDraft(restoredDraft);
      window.sessionStorage.removeItem("eve-chat-draft");
    }
  }, [viewer]);

  useEffect(() => {
    setDismissedError(null);
  }, [clientError]);

  const anonLimitReached = bootstrapped && !viewer && Boolean(anonChatId);
  const canStartAnonChat =
    bootstrapped && !viewer && !anonChatId && setupStatus.authMode === "neon";

  const handleSubmit = useCallback(
    async (text: string) => {
      const message = text.trim();

      if (!message || submittingRef.current) {
        return;
      }

      setClientError(null);

      const lengthError = getChatMessageLengthError(message);

      if (lengthError) {
        setClientError(lengthError);
        return;
      }

      if (!setupReady) {
        setClientError(
          getHomeComposerDisabledReason({
            anonLimitReached,
            setupStatus,
            submitting,
          }) ?? "Finish setup before chatting.",
        );
        return;
      }

      if (!viewer && !canStartAnonChat) {
        requestSignIn(message);
        return;
      }

      submittingRef.current = true;
      setSubmitting(true);
      setDraft("");

      if (!viewer) {
        try {
          await startAnonymousChatAction();
        } catch (error) {
          submittingRef.current = false;
          setSubmitting(false);
          setDraft(message);
          setClientError(
            error instanceof Error ? error.message : "Failed to start chat.",
          );
          return;
        }
      }

      const provisionalChatId = createProvisionalChatId();
      const didStoreMessage = writePendingChatMessage(provisionalChatId, message);

      if (!didStoreMessage) {
        submittingRef.current = false;
        setSubmitting(false);
        setDraft(message);
        setClientError("Failed to start chat.");
        return;
      }

      setActiveChatId(provisionalChatId);
      router.push(`/chat/${provisionalChatId}`, { scroll: false });
    },
    [
      anonLimitReached,
      canStartAnonChat,
      requestSignIn,
      router,
      setActiveChatId,
      setupReady,
      setupStatus,
      submitting,
      viewer,
    ],
  );

  const handlePromptSelect = useCallback((prompt: string) => {
    setDraft(prompt);

    window.requestAnimationFrame(() => {
      const input = document.querySelector<HTMLTextAreaElement>(
        "[data-chat-composer-input]",
      );
      input?.focus({ preventScroll: true });
      input?.setSelectionRange(prompt.length, prompt.length);
    });
  }, []);

  const composerDisabled = !setupReady || anonLimitReached;
  const composerDisabledReason = getHomeComposerDisabledReason({
    anonLimitReached,
    setupStatus,
    submitting,
  });

  if (pathname !== "/") {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-[calc(env(safe-area-inset-top)+3.5rem)] md:pt-[calc(env(safe-area-inset-top)+2rem)]">
      {toastError ? (
        <ErrorToast
          message={toastError}
          onDismiss={() => setDismissedError(toastError)}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col justify-between px-4 pt-8 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6 sm:pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <div className="flex min-h-0 flex-1 items-center justify-center pb-20 sm:pb-[12vh]">
          <div className="w-full max-w-2xl space-y-5 sm:space-y-7 md:space-y-8">
            <h1 className="flex justify-center">
              <img
                alt="otterchat"
                className="size-16 select-none sm:size-20 md:size-24"
                draggable={false}
                src="/logo.svg"
              />
            </h1>
            <ChatComposer
              autoFocus
              disabled={composerDisabled}
              disabledReason={composerDisabledReason}
              footerStart={<ComposerFooterControls setupStatus={setupStatus} />}
              isBusy={IDLE_CONTROLLER_STATUS.isBusy}
              isPreparing={submitting}
              onChange={setDraft}
              onStop={() => {}}
              onSubmit={handleSubmit}
              placeholder="Ask anything..."
              value={draft}
            />
            <MarqueePromptsDemo onSelect={handlePromptSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}

function getHomeComposerDisabledReason({
  anonLimitReached,
  setupStatus,
  submitting,
}: {
  readonly anonLimitReached: boolean;
  readonly setupStatus: SetupStatus;
  readonly submitting: boolean;
}) {
  if (anonLimitReached) {
    return ANON_LIMIT_REACHED_REASON;
  }

  if (!setupStatus.appReady) {
    const missing = setupStatus.missing.length
      ? ` Missing: ${setupStatus.missing.join(", ")}.`
      : "";

    return `Finish setup before chatting.${missing}`;
  }

  if (submitting) {
    return "Preparing chat.";
  }

  return undefined;
}
