import { launchDarklyFlag } from "@/lib/launchdarkly-flag";
import { getServerViewer } from "@/lib/session";

export const favoriteChats = launchDarklyFlag({
  key: "favorite-chats-gol-211",
  description: "Star chats and pin them in a Favorites sidebar section (GOL-211)",
  identify: async () => {
    const viewer = await getServerViewer();

    return viewer
      ? { kind: "user", key: viewer.id }
      : { kind: "user", key: "anonymous", anonymous: true };
  },
});
