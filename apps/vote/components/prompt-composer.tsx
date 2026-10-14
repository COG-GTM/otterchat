"use client";

import { useState } from "react";
import { Button } from "@otterchat/ui/components/button";
import type { PairForVoter } from "@/lib/pairs";
import { MAX_SUFFIX_CHARS, PROMPT_PREFIX } from "@/lib/prompt-prefix";

type PromptComposerProps = {
  readonly onPair: (pair: PairForVoter) => void;
};

export function PromptComposer({ onPair }: PromptComposerProps) {
  const [suffix, setSuffix] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!suffix.trim() || pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ suffix }),
      });
      const result = (await response.json().catch(() => ({}))) as { pair?: PairForVoter; error?: string };

      if (!response.ok || !result.pair) {
        throw new Error(result.error ?? `generate failed: ${response.status}`);
      }

      onPair(result.pair);
      setSuffix("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not render that prompt.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4" onSubmit={submit}>
      <label className="text-muted-foreground text-xs uppercase tracking-wide" htmlFor="prompt-suffix">
        write your own prompt
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="border-input focus-within:ring-ring/50 flex flex-1 items-center gap-1 rounded-md border px-3 font-mono text-sm focus-within:ring-[3px]">
          <span className="text-muted-foreground shrink-0">{PROMPT_PREFIX}</span>
          <input
            className="min-w-0 flex-1 bg-transparent py-2 outline-none"
            disabled={pending}
            id="prompt-suffix"
            maxLength={MAX_SUFFIX_CHARS}
            onChange={(event) => setSuffix(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="presenting at a conference"
            value={suffix}
          />
        </div>
        <Button disabled={pending || !suffix.trim()} type="submit">
          {pending ? "Rendering…" : "Render pair"}
        </Button>
      </div>
      <p className={error ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
        {error ?? (pending ? "Rendering two images, this can take a minute or two." : "Your pair shows up next to vote on.")}
      </p>
    </form>
  );
}
