import type { SetupStatus } from "@/lib/chat/types";
import { isDatabaseConfigured, isDatabaseSchemaReady } from "@/lib/db/client";

const AUTH_ENV_KEYS = [
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
] as const;

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function isAuthConfigured() {
  return AUTH_ENV_KEYS.every(hasEnv);
}

export function getInitialSetupStatus(): SetupStatus {
  return createSetupStatus({
    databaseSchemaReady: isDatabaseConfigured(),
  });
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const databaseConfigured = isDatabaseConfigured();
  const fullEnvironmentReady = databaseConfigured && isAuthConfigured();
  const databaseSchemaReady = fullEnvironmentReady
    ? await isDatabaseSchemaReady()
    : false;

  return createSetupStatus({ databaseSchemaReady });
}

export async function isAppConfigured() {
  const status = await getSetupStatus();

  return status.appReady;
}

function createSetupStatus({
  databaseSchemaReady,
}: {
  readonly databaseSchemaReady: boolean;
}): SetupStatus {
  const databaseConfigured = isDatabaseConfigured();
  const neonAuthReady = isAuthConfigured();
  const databaseReady = databaseConfigured && databaseSchemaReady;
  const fullEnvironmentReady = databaseConfigured && neonAuthReady;
  const localDevReady = isLocalDevelopment();

  if (fullEnvironmentReady) {
    return {
      appReady: databaseReady,
      authMode: "neon",
      authReady: neonAuthReady,
      databaseConfigured,
      databaseReady,
      databaseSchemaReady,
      missing: databaseSchemaReady ? [] : ["database migrations"],
      storageMode: "database",
    };
  }

  return {
    appReady: localDevReady,
    authMode: "local-dev",
    authReady: localDevReady,
    databaseConfigured,
    databaseReady,
    databaseSchemaReady,
    missing: localDevReady ? [] : ["DATABASE_URL and Neon Auth configuration"],
    storageMode: "browser",
  };
}

function isLocalDevelopment() {
  return process.env.NODE_ENV === "development" && process.env.VERCEL !== "1";
}
