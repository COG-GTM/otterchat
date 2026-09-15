import { flag } from "flags/next";
import type { LDContext } from "@launchdarkly/node-server-sdk";
import { boolVariation } from "@/lib/launchdarkly";

const launchDarklyProject = process.env.LAUNCHDARKLY_PROJECT_KEY ?? "default";
const launchDarklyEnvironment = process.env.LAUNCHDARKLY_ENVIRONMENT ?? "production";

type BooleanFlagDeclaration = {
  key: string;
  description: string;
  defaultValue?: boolean;
  identify?: () => LDContext | Promise<LDContext>;
};

export function launchDarklyFlag({
  key,
  description,
  defaultValue = false,
  identify,
}: BooleanFlagDeclaration) {
  return flag<boolean, LDContext | undefined>({
    key,
    description,
    defaultValue,
    options: [
      { value: false, label: "Off" },
      { value: true, label: "On" },
    ],
    origin: `https://app.launchdarkly.com/projects/${launchDarklyProject}/flags/${key}/targeting?env=${launchDarklyEnvironment}`,
    identify: identify ? async () => identify() : undefined,
    decide: ({ entities }) => boolVariation(key, defaultValue, entities),
  });
}
