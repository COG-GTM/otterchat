"use client";

import { Marquee } from "@/components/shadcn-space/animations/marquee";

const SAMPLE_PROMPTS: string[] = [
  "Summarize this article for me",
  "Help me draft a professional email",
  "Explain a concept like I'm five",
  "Brainstorm ideas for a side project",
  "Review my code for bugs",
  "Plan a weekend trip itinerary",
];

export default function MarqueePromptsDemo({
  onSelect,
}: {
  readonly onSelect?: (prompt: string) => void;
}) {
  return (
    <Marquee
      className="[--duration:30s] p-0 [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
      pauseOnHover
    >
      {SAMPLE_PROMPTS.map((prompt) => (
        <button
          className="mr-2 shrink-0 whitespace-nowrap rounded-full border border-border/80 bg-card/95 px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground dark:bg-muted/45"
          key={prompt}
          onClick={() => onSelect?.(prompt)}
          type="button"
        >
          {prompt}
        </button>
      ))}
    </Marquee>
  );
}
