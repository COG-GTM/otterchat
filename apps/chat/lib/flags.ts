import { launchDarklyFlag } from "@/lib/launchdarkly-flag";

export const exampleFlag = launchDarklyFlag({
  key: "otterchat-example-flag",
  description: "Verifies the Flags Explorer wiring. Not read by any feature.",
});

export const anonStartTypedResult = launchDarklyFlag({
  key: "anon-start-typed-result",
  description:
    "startAnonymousChatAction returns { ok: false, error } instead of throwing when sign-in is required (OTTERCHAT-6).",
});
