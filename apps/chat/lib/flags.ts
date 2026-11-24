import { launchDarklyFlag } from "@/lib/launchdarkly-flag";

export const favoriteChats = launchDarklyFlag({
  key: "favorite-chats-gol-274",
  description: "Favorite / star chats in the sidebar (GOL-274)",
});
