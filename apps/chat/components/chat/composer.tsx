"use client";

import { ArrowUpIcon, Loader2Icon, PaperclipIcon, SquareIcon, XIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  getAttachmentError,
  readAttachment,
  type ChatAttachment,
} from "@/lib/chat/attachments";
import { getChatMessageLength, MAX_CHAT_MESSAGE_CHARS } from "@/lib/chat/limits";
import { cn } from "@/lib/utils";

export function ChatComposer({
  attachments = [],
  autoFocus = true,
  className,
  disabled = false,
  disabledReason,
  footerStart,
  isBusy = false,
  isPreparing = false,
  maxLength = MAX_CHAT_MESSAGE_CHARS,
  onAttachmentError,
  onAttachmentsChange,
  onChange,
  onSubmit,
  placeholder = "Ask eve anything...",
  value,
}: {
  readonly attachments?: readonly ChatAttachment[];
  readonly autoFocus?: boolean;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
  readonly footerStart?: ReactNode;
  readonly isBusy?: boolean;
  readonly isPreparing?: boolean;
  readonly maxLength?: number;
  readonly onAttachmentError?: (message: string) => void;
  readonly onAttachmentsChange?: (attachments: readonly ChatAttachment[]) => void;
  readonly onChange: (value: string) => void;
  readonly onStop: () => void;
  readonly onSubmit: (value: string) => void | Promise<void>;
  readonly placeholder?: string;
  readonly value: string;
}) {
  const composerId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaDisabled = disabled || isBusy || isPreparing;
  const trimmedValue = value.trim();
  const isOverMaxLength = getChatMessageLength(trimmedValue) > maxLength;

  useEffect(() => {
    if (!autoFocus || textareaDisabled) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [autoFocus, textareaDisabled]);

  const submitValue = useCallback(() => {
    const text = value.trim();
    if (!text || disabled || isBusy || isPreparing || getChatMessageLength(text) > maxLength) {
      return;
    }

    void onSubmit(text);
  }, [disabled, isBusy, isPreparing, maxLength, onSubmit, value]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submitValue();
    },
    [submitValue],
  );

  const handleFilesSelected = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = [...(event.target.files ?? [])];

      event.target.value = "";

      if (files.length === 0 || !onAttachmentsChange) {
        return;
      }

      const accepted: ChatAttachment[] = [];

      for (const file of files) {
        const error = getAttachmentError(file);

        if (error) {
          onAttachmentError?.(error);
          continue;
        }

        if (attachments.length + accepted.length >= MAX_ATTACHMENTS) {
          onAttachmentError?.(`You can attach up to ${MAX_ATTACHMENTS} files.`);
          break;
        }

        try {
          accepted.push(await readAttachment(file));
        } catch {
          onAttachmentError?.(`${file.name} could not be read.`);
        }
      }

      if (accepted.length > 0) {
        onAttachmentsChange([...attachments, ...accepted]);
      }
    },
    [attachments, onAttachmentError, onAttachmentsChange],
  );

  const removeAttachment = useCallback(
    (id: string) => {
      onAttachmentsChange?.(attachments.filter((attachment) => attachment.id !== id));
    },
    [attachments, onAttachmentsChange],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitValue();
      }
    },
    [submitValue],
  );

  const form = (
    <form
      className={cn(
        "min-w-0 rounded-[14px] border border-border/80 bg-card/95 shadow-sm transition-colors focus-within:border-border focus-within:ring-[1px] focus-within:ring-foreground/5 dark:bg-muted/45 dark:focus-within:ring-white/5",
        className,
      )}
      data-chat-composer
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor={composerId}>
        Message eve
      </label>
      <textarea
        autoFocus={autoFocus}
        className="max-h-32 min-h-12 w-full resize-none bg-transparent px-3 pt-3 pb-1 text-base leading-6 outline-none placeholder:text-muted-foreground/45 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 md:text-[15px] dark:placeholder:text-muted-foreground/60"
        data-chat-composer-input
        disabled={textareaDisabled}
        id={composerId}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={textareaRef}
        rows={2}
        value={value}
      />
      {attachments.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5 px-3 pb-1 sm:px-4">
          {attachments.map((attachment) => (
            <li
              className="flex max-w-[12rem] items-center gap-1.5 rounded-md border border-border/60 bg-background/70 py-1 pr-1 pl-2 text-xs"
              key={attachment.id}
            >
              {attachment.mediaType.startsWith("image/") ? (
                <img
                  alt=""
                  className="size-5 shrink-0 rounded-sm object-cover"
                  src={attachment.data}
                />
              ) : (
                <PaperclipIcon className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{attachment.filename}</span>
              <Button
                aria-label={`Remove ${attachment.filename}`}
                className="size-4 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => removeAttachment(attachment.id)}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <XIcon className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex min-h-9 items-center justify-between gap-2 px-3 pt-1 pb-2 sm:gap-3 sm:px-4">
        <div className="-ml-2 flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          {onAttachmentsChange ? (
            <>
              <input
                accept={ATTACHMENT_ACCEPT}
                className="hidden"
                multiple
                onChange={(event) => void handleFilesSelected(event)}
                ref={fileInputRef}
                type="file"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="Attach files"
                    className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                    disabled={disabled || isBusy || isPreparing}
                    onClick={() => fileInputRef.current?.click()}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                  >
                    <PaperclipIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Attach images or PDFs</TooltipContent>
              </Tooltip>
            </>
          ) : null}
          {footerStart ?? <span className="block h-8" />}
        </div>
        <div className="flex shrink-0 items-center">
          {isBusy ? (
            <Button
              aria-label="Response in progress"
              className="size-6 cursor-default rounded-md bg-foreground/15 text-foreground/55 shadow-none hover:bg-foreground/15 disabled:cursor-default disabled:pointer-events-auto disabled:opacity-100"
              disabled
              size="icon-xs"
              type="button"
            >
              <SquareIcon className="size-2.5 fill-current" />
            </Button>
          ) : isPreparing ? (
            <Button
              aria-label="Preparing chat"
              className="size-6 rounded-md bg-primary/75 text-primary-foreground"
              disabled
              size="icon-xs"
              type="button"
            >
              <Loader2Icon className="size-3 animate-spin" />
            </Button>
          ) : (
            <Button
              aria-label="Send message"
              className="size-6 cursor-pointer rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:pointer-events-auto disabled:opacity-30"
              disabled={disabled || trimmedValue.length === 0 || isOverMaxLength}
              size="icon-xs"
              type="submit"
            >
              <ArrowUpIcon className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </form>
  );

  if (!disabledReason || (!disabled && !isBusy && !isPreparing)) {
    return form;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div aria-label={disabledReason} className="min-w-0" tabIndex={0}>
          {form}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">{disabledReason}</TooltipContent>
    </Tooltip>
  );
}
