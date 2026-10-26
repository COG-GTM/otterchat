import { launchDarklyFlag } from "@/lib/launchdarkly-flag";

export const favoriteChats = launchDarklyFlag({
  key: "favorite-chats-gol-251",
  description: "Star chats and pin them in a Favorites sidebar section",
});
