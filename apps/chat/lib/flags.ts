import { launchDarklyFlag } from "@/lib/launchdarkly-flag";

export const exampleFlag = launchDarklyFlag({
  key: "otterchat-example-flag",
  description: "Verifies the Flags Explorer wiring. Not read by any feature.",
});

export const favoriteChats = launchDarklyFlag({
  key: "favorite-chats-gol-209",
  description: "Favorites section and star toggle in the chat sidebar (GOL-209)",
});
