"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@otterchat/ui/components/button";
import { Separator } from "@otterchat/ui/components/separator";
import type { VoteChoice } from "@/lib/db/schema";
import type { PairForVoter, VoteProgress } from "@/lib/pairs";

const REFILL_THRESHOLD = 3;
const REFILL_SIZE = 10;

type VoteDeckProps = {
  readonly initialPairs: readonly PairForVoter[];
  readonly initialProgress: VoteProgress;
};

export function VoteDeck({ initialPairs, initialProgress }: VoteDeckProps) {
  const [queue, setQueue] = useState<readonly PairForVoter[]>(initialPairs);
  const [progress, setProgress] = useState(initialProgress);
  const [refilling, setRefilling] = useState(false);
  const current = queue[0];

  const refill = useCallback(async () => {
    setRefilling(true);

    try {
      const response = await fetch(`/api/next-pair?limit=${REFILL_SIZE}`, { cache: "no-store" });

      if (!response.ok) {
        return;
      }

      const { pairs } = (await response.json()) as { pairs: PairForVoter[] };

      setQueue((previous) => {
        const seen = new Set(previous.map((pair) => pair.id));

        return [...previous, ...pairs.filter((pair) => !seen.has(pair.id))];
      });
    } finally {
      setRefilling(false);
    }
  }, []);

  const submit = useCallback(
    (choice: VoteChoice) => {
      const pair = current;

      if (!pair) {
        return;
      }

      setQueue((previous) => previous.slice(1));
      setProgress((previous) => ({
        ...previous,
        voted: previous.voted + 1,
        remaining: Math.max(previous.remaining - 1, 0),
      }));

      void fetch("/api/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pairId: pair.id, choice }),
      });
    },
    [current],
  );

  useEffect(() => {
    if (queue.length <= REFILL_THRESHOLD && !refilling) {
      void refill();
    }
  }, [queue.length, refill, refilling]);

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
        submit(choice);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [submit]);

  if (!current) {
    return (
      <section className="border-border bg-card flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border p-12 text-center">
        <p className="text-lg font-medium">No pairs left to judge</p>
        <p className="text-muted-foreground text-sm">
          You voted on {progress.voted} of {progress.total}. New pairs appear here after the next
          generation run.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-5">
      <div className="border-border bg-card rounded-xl border p-4">
        <p className="text-muted-foreground text-xs uppercase tracking-wide">prompt</p>
        <p className="font-mono text-sm">{current.prompt}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Choice
          hint="←"
          image={current.imageAUrl}
          label="A"
          onSelect={() => submit("a")}
          prompt={current.prompt}
        />
        <Choice
          hint="→"
          image={current.imageBUrl}
          label="B"
          onSelect={() => submit("b")}
          prompt={current.prompt}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => submit("tie")} variant="secondary">
          Tie <kbd className="text-muted-foreground ml-1 font-mono text-xs">T</kbd>
        </Button>
        <Button onClick={() => submit("skip")} variant="ghost">
          Skip <kbd className="text-muted-foreground ml-1 font-mono text-xs">S</kbd>
        </Button>
      </div>

      <Separator />

      <p className="text-muted-foreground text-center text-sm">
        {progress.voted} voted · {progress.remaining} left · lora {current.loraVersion}
      </p>
    </section>
  );
}

type ChoiceProps = {
  readonly hint: string;
  readonly image: string;
  readonly label: string;
  readonly onSelect: () => void;
  readonly prompt: string;
};

function Choice({ hint, image, label, onSelect, prompt }: ChoiceProps) {
  return (
    <button
      className="border-border bg-card hover:border-ring focus-visible:ring-ring/50 group relative overflow-hidden rounded-xl border text-left transition focus-visible:ring-[3px] focus-visible:outline-none"
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
