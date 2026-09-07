import { Suspense } from "react";
import { HomeChatPage } from "@/app/_components/home-chat-page";
import { LaunchDarklyBanner } from "@/components/launchdarkly-banner";

export default function Page() {
  return (
    <>
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+4rem)] sm:px-6 md:pt-[calc(env(safe-area-inset-top)+2.5rem)]">
        <Suspense fallback={null}>
          <LaunchDarklyBanner />
        </Suspense>
      </div>
      <HomeChatPage />
    </>
  );
}
