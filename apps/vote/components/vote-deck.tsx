"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@otterchat/ui/components/button";
import { Separator } from "@otterchat/ui/components/separator";
import type { VoteChoice } from "@/lib/db/schema";
import type { PairForVoter, VoteProgress } from "@/lib/pairs";
import { PromptComposer } from "@/components/prompt-composer";
import type { OtterimageModel } from "@/lib/otterimage";

const REFILL_THRESHOLD = 3;
const REFILL_SIZE = 10;

type VoteDeckProps = {
  readonly initialPairs: readonly PairForVoter[];
  readonly initialProgress: VoteProgress;
  readonly models: readonly OtterimageModel[];
};

export function VoteDeck({ initialPairs, initialProgress, models }: VoteDeckProps) {
  const [queue, setQueue] = useState<readonly PairForVoter[]>(initialPairs);
  const [progress, setProgress] = useState(initialProgress);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drained, setDrained] = useState(false);
  const refilling = useRef(false);
  const submitting = useRef(false);
  const queueIds = useRef(new Set(initialPairs.map((pair) => pair.id)));
  const progressEpoch = useRef(0);
  const current = queue[0];

  const refill = useCallback(async () => {
    if (refilling.current) {
      return;
    }

    refilling.current = true;
    const epoch = progressEpoch.current;

    try {
      const response = await fetch(`/api/next-pair?limit=${REFILL_SIZE}`, { cache: "no-store" });

      if (!response.ok) {
        setDrained(true);

        return;
      }

      const { pairs, progress: latest } = (await response.json()) as {
        pairs: PairForVoter[];
        progress: VoteProgress;
      };

      if (epoch === progressEpoch.current) {
        setProgress(latest);
      }

      const fresh = pairs.filter((pair) => !queueIds.current.has(pair.id));

      if (fresh.length === 0) {
        setDrained(true);

        return;
      }

      for (const pair of fresh) {
        queueIds.current.add(pair.id);
      }

      setQueue((previous) => [...previous, ...fresh]);
    } finally {
      refilling.current = false;
    }
  }, []);

  const submit = useCallback(
    async (choice: VoteChoice) => {
      const pair = current;

      if (!pair || submitting.current) {
        return;
      }

      submitting.current = true;
      setPending(true);
      setError(null);

      try {
        const response = await fetch("/api/vote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ pairId: pair.id, choice }),
        });

        if (!response.ok) {
          throw new Error(`vote failed: ${response.status}`);
        }

        queueIds.current.delete(pair.id);
        progressEpoch.current += 1;
        setQueue((previous) => previous.filter((queued) => queued.id !== pair.id));
        setProgress((previous) => ({
          ...previous,
          voted: previous.voted + 1,
          remaining: Math.max(previous.remaining - 1, 0),
        }));
      } catch {
        setError("Could not save that vote. Try again.");
      } finally {
        submitting.current = false;
        setPending(false);
      }
    },
    [current],
  );

  const addOwnPair = useCallback((pair: PairForVoter) => {
    const alreadyCounted = queueIds.current.has(pair.id);
    queueIds.current.add(pair.id);
    setQueue((previous) => [pair, ...previous.filter((queued) => queued.id !== pair.id)]);
    if (!alreadyCounted) {
      progressEpoch.current += 1;
      setProgress((previous) => ({
        ...previous,
        remaining: previous.remaining + 1,
        total: previous.total + 1,
      }));
    }
  }, []);

  const composer = models.length > 0 ? <PromptComposer models={models} onPair={addOwnPair} /> : null;

  useEffect(() => {
    if (queue.length <= REFILL_THRESHOLD && !drained) {
      void refill();
    }
  }, [queue.length, drained, refill]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();
      const choice: VoteChoice | null =
        key === "arrowleft" ? "a" : key === "arrowright" ? "b" : key === "t" ? "tie" : key === "s" ? "skip" : null;

      if (choice) {
        event.preventDefault();
        void submit(choice);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [submit]);

  if (!current) {
    return (
      <>
      {composer}
      <section className="border-border bg-card flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border p-12 text-center">
        <p className="text-lg font-medium">No pairs left to judge</p>
        <p className="text-muted-foreground text-sm">
          You voted on {progress.voted} of {progress.total}. New pairs appear here after the next
          generation run.
        </p>
        <Button
          onClick={() => {
            setDrained(false);
          }}
          variant="secondary"
        >
          Check for new pairs
        </Button>
      </section>
      </>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-5">
      {composer}
      <div className="border-border bg-card rounded-xl border p-4">
        <p className="text-muted-foreground text-xs uppercase tracking-wide">prompt</p>
        <p className="font-mono text-sm">{current.prompt}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Choice
          hint="←"
          disabled={pending}
          image={current.imageAUrl}
          label="A"
          onSelect={() => void submit("a")}
          prompt={current.prompt}
        />
        <Choice
          hint="→"
          disabled={pending}
          image={current.imageBUrl}
          label="B"
          onSelect={() => void submit("b")}
          prompt={current.prompt}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button disabled={pending} onClick={() => void submit("tie")} variant="secondary">
          Tie <kbd className="text-muted-foreground ml-1 font-mono text-xs">T</kbd>
        </Button>
        <Button disabled={pending} onClick={() => void submit("skip")} variant="ghost">
          Skip <kbd className="text-muted-foreground ml-1 font-mono text-xs">S</kbd>
        </Button>
      </div>

      {error ? <p className="text-destructive text-center text-sm">{error}</p> : null}

      <Separator />

      <p className="text-muted-foreground text-center text-sm">
        {progress.voted} voted · {progress.remaining} left · lora {current.loraVersion}
      </p>
    </section>
  );
}

type ChoiceProps = {
  readonly disabled: boolean;
  readonly hint: string;
  readonly image: string;
  readonly label: string;
  readonly onSelect: () => void;
  readonly prompt: string;
};

function Choice({ disabled, hint, image, label, onSelect, prompt }: ChoiceProps) {
  return (
    <button
      className="border-border bg-card hover:border-ring focus-visible:ring-ring/50 group relative overflow-hidden rounded-xl border text-left transition focus-visible:ring-[3px] focus-visible:outline-none disabled:opacity-60"
      disabled={disabled}
      onClick={onSelect}
      type="button"
    >
      <div className="relative aspect-square w-full">
        <Image
          alt={`${label}: ${prompt}`}
          className="object-cover transition group-hover:scale-[1.01]"
          fill
          sizes="(min-width: 640px) 50vw, 100vw"
          src={image}
          unoptimized
        />
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-medium">{label}</span>
        <kbd className="text-muted-foreground font-mono text-xs">{hint}</kbd>
      </div>
    </button>
  );
}
