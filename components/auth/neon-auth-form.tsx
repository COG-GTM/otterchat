"use client";

import { Loader2Icon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type AuthFormMode = "sign-in" | "sign-up";

export function NeonAuthForm({
  callbackPath,
  disabled,
  onBeforeSignIn,
}: {
  readonly callbackPath?: string;
  readonly disabled?: boolean;
  readonly onBeforeSignIn?: () => void;
}) {
  const [mode, setMode] = useState<AuthFormMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isSignUp = mode === "sign-up";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email || !password || pending) {
      return;
    }

    setError(null);
    setPending(true);

    try {
      const result = isSignUp
        ? await authClient.signUp.email({ email, name: name || email, password })
        : await authClient.signIn.email({ email, password });

      if (result?.error) {
        setError(result.error.message ?? "Unable to sign in.");
        setPending(false);
        return;
      }

      onBeforeSignIn?.();
      window.location.assign(resolveCallbackPath(callbackPath));
    } catch {
      setError("Unable to sign in. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      {isSignUp ? (
        <Input
          aria-label="Name"
          autoComplete="name"
          disabled={disabled || pending}
          id="eve-chat-name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Name"
          type="text"
          value={name}
        />
      ) : null}
      <Input
        aria-label="Email"
        autoComplete="email"
        autoFocus
        disabled={disabled || pending}
        id="eve-chat-email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email"
        required
        type="email"
        value={email}
      />
      <Input
        aria-label="Password"
        autoComplete={isSignUp ? "new-password" : "current-password"}
        disabled={disabled || pending}
        id="eve-chat-auth-password"
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password"
        required
        type="password"
        value={password}
      />
      {error ? (
        <p aria-live="polite" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        aria-busy={pending}
        className="h-11 w-full"
        disabled={disabled || pending}
        type="submit"
      >
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
        {pending
          ? isSignUp
            ? "Creating account..."
            : "Signing in..."
          : isSignUp
            ? "Create account"
            : "Sign in"}
      </Button>
      <button
        className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        disabled={pending}
        onClick={() => {
          setError(null);
          setMode(isSignUp ? "sign-in" : "sign-up");
        }}
        type="button"
      >
        {isSignUp ? "Have an account? Sign in" : "New here? Create an account"}
      </button>
    </form>
  );
}

function resolveCallbackPath(path: string | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }

  return path;
}
