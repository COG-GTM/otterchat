import { launchDarklyFlag } from "@/lib/launchdarkly-flag";

export const favoriteChats = launchDarklyFlag({
  key: "ttrcht-3-favorite-chats",
  description: "Favorites section and star toggle in the chat sidebar (TTRCHT-3)",
});
