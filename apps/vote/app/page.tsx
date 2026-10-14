import Link from "next/link";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getProgress, getUnvotedPairs } from "@/lib/pairs";
import { availableModels } from "@/lib/otterimage";
import { getVoterId } from "@/lib/voter";
import { SetupNotice } from "@/components/setup-notice";
import { VoteDeck } from "@/components/vote-deck";

export const dynamic = "force-dynamic";

export default async function VotePage() {
  if (!isDatabaseConfigured()) {
    return <SetupNotice />;
  }

  const voterId = await getVoterId();
  const [pairs, progress] = await Promise.all([
    getUnvotedPairs(voterId, 10),
    getProgress(voterId),
  ]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ottervote</h1>
          <p className="text-muted-foreground text-sm">
            Which image looks more like Devin, and follows the prompt better?
          </p>
        </div>
        <Link className="text-muted-foreground text-sm underline-offset-4 hover:underline" href="/stats">
          stats
        </Link>
      </header>
      <VoteDeck models={availableModels()} initialPairs={pairs} initialProgress={progress} />
    </main>
  );
}
