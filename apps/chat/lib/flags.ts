import { launchDarklyFlag } from "@/lib/launchdarkly-flag";

export const exampleFlag = launchDarklyFlag({
  key: "otterchat-example-flag",
  description: "Verifies the Flags Explorer wiring. Not read by any feature.",
});

export const favoriteChats = launchDarklyFlag({
  key: "favorite-chats-gol-208",
  description: "Star chats and pin them in a Favorites sidebar section (GOL-208).",
});
