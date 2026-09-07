import { init, type LDClient, type LDContext } from "@launchdarkly/node-server-sdk";

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
    return await client.boolVariation(flagKey, context, defaultValue);
  } catch {
    return defaultValue;
  }
}
