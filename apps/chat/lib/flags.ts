import { launchDarklyFlag } from "@/lib/launchdarkly-flag";
import { getServerViewer } from "@/lib/session";

export const exampleFlag = launchDarklyFlag({
  key: "otterchat-example-flag",
  description: "Verifies the Flags Explorer wiring. Not read by any feature.",
});

export const favoriteChats = launchDarklyFlag({
  key: "favorite-chats",
  description: "Star chats and group favorites above recents in the sidebar",
  identify: async () => {
    const viewer = await getServerViewer();
    return viewer ? { kind: "user", key: viewer.id } : { kind: "user", key: "anonymous", anonymous: true };
  },
});
