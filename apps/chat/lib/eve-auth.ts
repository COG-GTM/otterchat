import type { AuthFn } from "eve/channels/auth";
import {
  ANON_SESSION_COOKIE_NAME,
  verifyAnonSessionToken,
} from "@/lib/anon-session";
import { getSetupStatus } from "@/lib/setup";

const NEON_AUTH_SESSION_COOKIE_NAME = "__Secure-neon-auth.session_token";

type NeonSessionUser = {
  readonly email: string;
  readonly id: string;
  readonly name: string;
};

export const neonAuthEveAuth: AuthFn<Request> = async (request) => {
  const setupStatus = await getSetupStatus();

  if (!setupStatus.appReady || setupStatus.authMode !== "neon") {
    return null;
  }

  const user = await getNeonSessionUser(request);

  if (!user) {
    return null;
  }

  return {
    attributes: {
      email: user.email,
      name: user.name,
    },
    authenticator: "neon-auth",
    issuer: "neon-auth",
    principalId: user.id,
    principalType: "user",
    subject: user.email,
  };
};

async function getNeonSessionUser(
  request: Request,
): Promise<NeonSessionUser | null> {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim().replace(/\/+$/, "");
  const sessionToken = getCookieValue(
    request.headers.get("cookie"),
    NEON_AUTH_SESSION_COOKIE_NAME,
  );

  if (!baseUrl || !sessionToken) {
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/get-session`, {
      headers: {
        cookie: `${NEON_AUTH_SESSION_COOKIE_NAME}=${sessionToken}`,
      },
      signal: AbortSignal.timeout(3_000),
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as {
      readonly user?: Partial<NeonSessionUser> | null;
    } | null;
    const user = body?.user;

    if (!user?.id || !user.email) {
      return null;
    }

    return {
      email: user.email,
      id: user.id,
      name: user.name ?? user.email,
    };
  } catch {
    return null;
  }
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");

    if (separatorIndex < 0) {
      continue;
    }

    if (part.slice(0, separatorIndex).trim() === name) {
      return part.slice(separatorIndex + 1).trim();
    }
  }

  return null;
}

export const anonymousEveAuth: AuthFn<Request> = async (request) => {
  const setupStatus = await getSetupStatus();

  if (!setupStatus.appReady || setupStatus.authMode !== "neon") {
    return null;
  }

  const token = getCookieValue(
    request.headers.get("cookie"),
    ANON_SESSION_COOKIE_NAME,
  );
  const anonId = verifyAnonSessionToken(
    token ? decodeURIComponent(token) : undefined,
  );

  if (!anonId) {
    return null;
  }

  return {
    attributes: {
      anonymous: "true",
    },
    authenticator: "anonymous",
    issuer: "eve-chat-template",
    principalId: `anon:${anonId}`,
    principalType: "user",
    subject: `anon:${anonId}`,
  };
};
