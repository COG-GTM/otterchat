"use client";

import { MailIcon } from "lucide-react";
import { NeonAuthForm } from "@/components/auth/neon-auth-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SignInModal({
  callbackPath,
  disabled,
  onBeforeSignIn,
  onOpenChange,
  open,
}: {
  readonly callbackPath?: string;
  readonly disabled?: boolean;
  readonly onBeforeSignIn?: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mb-2 flex size-10 items-center justify-center rounded-full border border-border bg-muted">
            <MailIcon className="size-4 text-foreground" />
          </div>
          <DialogTitle>Sign up or in to get started</DialogTitle>
          <DialogDescription>
            Sign in with your email to send messages and save sessions.
          </DialogDescription>
        </DialogHeader>
        <NeonAuthForm
          callbackPath={callbackPath}
          disabled={disabled}
          onBeforeSignIn={onBeforeSignIn}
        />
      </DialogContent>
    </Dialog>
  );
}
