import {
  init,
  type LDClient,
  type LDContext,
  type LDMultiKindContext,
  type LDSingleKindContext,
} from "@launchdarkly/node-server-sdk";

let clientPromise: Promise<LDClient> | null = null;

function getClient() {
  const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY;

  if (!sdkKey) {
    return null;
  }

  clientPromise ??= (async () => {
    const client = init(sdkKey);
    await client.waitForInitialization({ timeout: 5 });
    return client;
  })();

  return clientPromise;
}

const anonymousContext: LDContext = {
  kind: "user",
  key: "anonymous",
  anonymous: true,
};

// Preview, production, and development share one SDK key, so flags target
// Vercel preview deployments through this context kind instead of an environment.
const deploymentContext = {
  key: process.env.VERCEL_ENV ?? "development",
};

function withDeployment(context: LDContext): LDContext {
  if ("kind" in context && context.kind === "multi") {
    return { ...context, deployment: deploymentContext };
  }

  const { kind = "user", ...single } = context as LDSingleKindContext;
  return {
    kind: "multi",
    [kind]: single,
    deployment: deploymentContext,
  } as LDMultiKindContext;
}

export async function boolVariation(
  flagKey: string,
  defaultValue: boolean,
  context: LDContext = anonymousContext,
) {
  const client = await getClient();

  if (!client) {
    return defaultValue;
  }

  try {
    return await client.boolVariation(flagKey, withDeployment(context), defaultValue);
  } catch {
    return defaultValue;
  }
}
