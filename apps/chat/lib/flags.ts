import { launchDarklyFlag } from "@/lib/launchdarkly-flag";
import { getServerViewer } from "@/lib/session";

export const exampleFlag = launchDarklyFlag({
  key: "otterchat-example-flag",
  description: "Verifies the Flags Explorer wiring. Not read by any feature.",
});

export const favoriteChats = launchDarklyFlag({
  key: "favorite-chats-gol-208",
  description: "Star chats and pin them in a Favorites sidebar section (GOL-208).",
  identify: async () => {
    const viewer = await getServerViewer();

    return viewer
      ? { kind: "user", key: viewer.id, email: viewer.email, name: viewer.name }
      : { kind: "user", key: "anonymous", anonymous: true };
  },
});
