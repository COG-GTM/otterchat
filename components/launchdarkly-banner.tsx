import { boolVariation } from "@/lib/launchdarkly";

export const LAUNCHDARKLY_TEST_BANNER_FLAG = "launchdarkly-test-banner";

const flagUrl = `https://app.launchdarkly.com/projects/default/flags/${LAUNCHDARKLY_TEST_BANNER_FLAG}/targeting?env=test`;

export async function LaunchDarklyBanner() {
  const enabled = await boolVariation(LAUNCHDARKLY_TEST_BANNER_FLAG, false);

  return (
    <div
      className={
        enabled
          ? "flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-300"
          : "flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2 text-muted-foreground text-sm"
      }
    >
      <span>LaunchDarkly test banner (flag is {enabled ? "on" : "off"})</span>
      <a
        className="underline underline-offset-4"
        href={flagUrl}
        rel="noreferrer"
        target="_blank"
      >
        View flag
      </a>
    </div>
  );
}
