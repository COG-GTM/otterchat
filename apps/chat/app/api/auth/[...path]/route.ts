import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  AUTH_HINT_COOKIE_MAX_AGE,
  AUTH_HINT_COOKIE_NAME,
  AUTH_HINT_COOKIE_VALUE,
  isSecureAuthHintCookie,
} from "@/lib/auth-hint";
import { getSetupStatus } from "@/lib/setup";

const SESSION_COOKIE_NAME_FRAGMENT = "session_token";

type RouteContext = {
  readonly params: Promise<{ readonly path: string[] }>;
};

const handlers = auth.handler();

export async function GET(request: Request, context: RouteContext) {
  return handleAuth(request, context, handlers.GET);
}

export async function POST(request: Request, context: RouteContext) {
  return handleAuth(request, context, handlers.POST);
}

async function handleAuth(
  request: Request,
  context: RouteContext,
  handler: (request: Request, context: RouteContext) => Promise<Response>,
) {
  const setupStatus = await getSetupStatus();

  if (!setupStatus.databaseConfigured) {
    return redirectToAuthError(request, "database_not_configured");
  }

  if (!setupStatus.databaseSchemaReady) {
    return redirectToAuthError(request, "database_migrations_missing");
  }

  if (!setupStatus.authReady) {
    return redirectToAuthError(request, "auth_env_missing");
  }

  const response = await handler(request, context);

  return withAuthHintCookie(response);
}

function redirectToAuthError(request: Request, error: string) {
  const url = new URL("/auth/error", request.url);
  url.searchParams.set("error", error);

  return NextResponse.redirect(url);
}

function withAuthHintCookie(response: Response) {
  const authState = getAuthStateFromSetCookie(response.headers.getSetCookie());

  if (!authState) {
    return response;
  }

  const nextResponse = new NextResponse(response.body, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });

  if (authState === "logged-in") {
    nextResponse.cookies.set(AUTH_HINT_COOKIE_NAME, AUTH_HINT_COOKIE_VALUE, {
      httpOnly: false,
      maxAge: AUTH_HINT_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: isSecureAuthHintCookie(),
    });
  } else {
    nextResponse.cookies.set(AUTH_HINT_COOKIE_NAME, "", {
      expires: new Date(0),
      httpOnly: false,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: isSecureAuthHintCookie(),
    });
  }

  return nextResponse;
}

function getAuthStateFromSetCookie(setCookies: readonly string[]) {
  for (const setCookie of setCookies) {
    const [pair, ...attributeParts] = setCookie.split(";");
    const separatorIndex = pair?.indexOf("=") ?? -1;

    if (!pair || separatorIndex < 0) {
      continue;
    }

    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();

    if (!name.includes(SESSION_COOKIE_NAME_FRAGMENT)) {
      continue;
    }

    const maxAge = attributeParts
      .map((part) => part.trim().toLowerCase())
      .find((part) => part.startsWith("max-age="))
      ?.slice("max-age=".length);

    return value && maxAge !== "0" ? "logged-in" : "logged-out";
  }

  return null;
}
