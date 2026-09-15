import { launchDarklyFlag } from "@/lib/launchdarkly-flag";

export const exampleFlag = launchDarklyFlag({
  key: "otterchat-example-flag",
  description: "Verifies the Flags Explorer wiring. Not read by any feature.",
});
