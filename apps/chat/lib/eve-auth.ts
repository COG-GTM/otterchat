import { ForbiddenError, type AuthFn } from "eve/channels/auth";
import {
  ANON_SESSION_COOKIE_NAME,
  ANON_SESSION_MAX_AGE,
  verifyAnonSessionToken,
} from "@/lib/anon-session";
import { getPasswordSessionFromHeaders } from "@/lib/password-auth";
import { RateLimitError, enforceRateLimit } from "@/lib/rate-limit";
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

const ANON_NEW_SESSION_LIMIT = 1;
const ANON_TURN_LIMIT = 30;
const ANON_TURN_WINDOW_SECONDS = 60 * 60;

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

  if (request.method === "POST") {
    const isNewSession = new URL(request.url).pathname === "/eve/v1/session";

    try {
      await enforceRateLimit(
        isNewSession
          ? {
              key: anonId,
              limit: ANON_NEW_SESSION_LIMIT,
              prefix: "anon:new-session",
              windowSeconds: ANON_SESSION_MAX_AGE,
            }
          : {
              key: anonId,
              limit: ANON_TURN_LIMIT,
              prefix: "anon:turn",
              windowSeconds: ANON_TURN_WINDOW_SECONDS,
            },
      );
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw new ForbiddenError({
          message: isNewSession
            ? "Sign in to start a new session."
            : "Sign in to keep chatting.",
        });
      }

      throw error;
    }
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

export const passwordEveAuth: AuthFn<Request> = async (request) => {
  const setupStatus = await getSetupStatus();

  if (
    !setupStatus.appReady ||
    setupStatus.authMode !== "password" ||
    !getPasswordSessionFromHeaders(request.headers)
  ) {
    return null;
  }

  return {
    attributes: {
      email: "local@eve.dev",
      name: "eve user",
    },
    authenticator: "password",
    issuer: "eve-chat-template",
    principalId: "eve-chat-user",
    principalType: "user",
    subject: "eve-chat-user",
  };
};
