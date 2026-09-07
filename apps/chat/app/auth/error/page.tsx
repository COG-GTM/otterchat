import { AlertCircleIcon, ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";

const SETUP_DOCS_URL =
  "https://github.com/vercel-labs/eve-chat-template/blob/main/docs/setup-and-deploy.md";
const NEON_AUTH_DOCS_URL = "https://neon.com/docs/auth/overview";

export default async function AuthErrorPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <Suspense fallback={<AuthErrorCard message={getAuthErrorMessage()} />}>
        <AuthErrorContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function AuthErrorContent({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = getParam(params.error);
  const errorDescription = getParam(params.error_description);
  const message = getAuthErrorMessage(error, errorDescription);

  return <AuthErrorCard error={error} message={message} />;
}

function AuthErrorCard({
  error,
  message,
}: {
  readonly error?: string;
  readonly message: ReturnType<typeof getAuthErrorMessage>;
}) {
  return (
    <div className="w-full max-w-xl rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-destructive">
            <AlertCircleIcon className="size-4" />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Authentication setup</p>
            <h1 className="text-2xl font-semibold tracking-normal">{message.title}</h1>
            <p className="text-sm leading-6 text-muted-foreground">{message.body}</p>
            {error ? (
              <p className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button asChild className="h-8 rounded-md px-3 text-sm">
            <Link href="/">
              <ArrowLeftIcon className="size-4" />
              Back to chat
            </Link>
          </Button>
          <Button asChild className="h-8 rounded-md px-3 text-sm" variant="outline">
            <a href={SETUP_DOCS_URL} rel="noreferrer" target="_blank">
              Setup guide
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </Button>
          <Button asChild className="h-8 rounded-md px-3 text-sm" variant="outline">
            <a href={NEON_AUTH_DOCS_URL} rel="noreferrer" target="_blank">
              Neon Auth docs
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </Button>
        </div>
      </div>
  );
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getAuthErrorMessage(error?: string, description?: string) {
  if (error === "database_not_configured") {
    return {
      title: "Neon is not connected",
      body:
        "Connect Neon Postgres to this deployment so DATABASE_URL is available, then run database migrations and try signing in again.",
    };
  }

  if (error === "database_migrations_missing") {
    return {
      title: "Database migrations are missing",
      body:
        "Run production migrations with vercel env run -e production -- pnpm db:migrate, then try signing in again. This creates the chat tables.",
    };
  }

  if (error === "auth_env_missing") {
    return {
      title: "Auth environment variables are missing",
      body:
        "Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET, then redeploy or restart the dev server. Neon Auth must be enabled for the project's branch in the Neon console.",
    };
  }

  if (
    description?.toLowerCase().includes("relation") ||
    description?.toLowerCase().includes("table") ||
    description?.toLowerCase().includes("database")
  ) {
    return {
      title: "Database migrations may be missing",
      body:
        "Run production migrations with vercel env run -e production -- pnpm db:migrate, then retry sign-in. This creates the chat tables.",
    };
  }

  return {
    title: "Sign-in could not finish",
    body:
      "Check that Neon Auth is enabled for this project's branch, that NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET are set, and that database migrations have run. The setup guide has the exact values to verify.",
  };
}
