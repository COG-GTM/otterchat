import type { SetupStatus } from "@/lib/chat/types";
import { isDatabaseConfigured, isDatabaseSchemaReady } from "@/lib/db/client";

const PASSWORD_ENV_KEY = "EVE_CHAT_PASSWORD";
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

export function isPasswordConfigured() {
  return Boolean(process.env.EVE_CHAT_PASSWORD?.trim());
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
  const passwordReady = isPasswordConfigured();
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

  if (passwordReady || localDevReady) {
    return {
      appReady: true,
      authMode: passwordReady ? "password" : "local-dev",
      authReady: true,
      databaseConfigured,
      databaseReady,
      databaseSchemaReady,
      missing: [],
      storageMode: "browser",
    };
  }

  return {
    appReady: false,
    authMode: "unconfigured",
    authReady: false,
    databaseConfigured,
    databaseReady,
    databaseSchemaReady,
    missing: [
      PASSWORD_ENV_KEY,
      "or DATABASE_URL and Neon Auth configuration",
    ],
    storageMode: "browser",
  };
}

function isLocalDevelopment() {
  return process.env.NODE_ENV === "development" && process.env.VERCEL !== "1";
}
