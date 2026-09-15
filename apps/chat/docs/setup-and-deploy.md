# Setup and Deployment

This guide covers local development, the production persistence upgrade, and Neon Auth.

## Prerequisites

- Node.js 24 or newer
- pnpm through Corepack
- A Vercel account
- Vercel CLI, either installed globally or run with `pnpm dlx`

```bash
corepack enable
pnpm install
pnpm dlx vercel@latest login
```

The commands below use `vercel`. If you do not have a global install, replace `vercel` with `pnpm dlx vercel@latest`.

## Local Development

Without Neon variables, `next dev` runs in local development mode: requests use a synthetic local identity, and chats and eve session cursors are stored in the current browser's localStorage, so history does not follow the user to another browser.

Local development mode never applies to a deployment. A deployment without the full production environment fails closed and does not allow chat requests.

## Production Persistence Upgrade

Configure Neon (Postgres + Neon Auth) to switch the same codebase into production mode. Production mode uses Neon Auth identity and database-backed per-user history. The setup script automates this path:

```bash
./scripts/setup.sh
# Or: ./scripts/setup.sh --scope <team-slug>
```

Once all production environment variables are present, production mode is used. Run migrations after the first production deployment:

```bash
vercel env run -e production -- pnpm db:migrate
```

## Local Project Link

Create or select the Vercel project that will run this template:

```bash
vercel link
```

If you are working in a team, pass the team scope:

```bash
vercel link --scope <team-slug>
```

## Production Storage

Neon is required only for production mode.

Provision Neon:

```bash
vercel integration add neon
```

Follow the prompts and connect the resource to the linked project.

When Neon is created through the import flow, `DATABASE_URL` is usually marked sensitive and applied to Production and Preview. That is fine for deployed migrations with `vercel env run`. Select Development for the Neon env var only if you want `DATABASE_URL` to be pulled into `.env.local`; selecting Development will make it available to local dev.

Pull local env vars if you are running the app locally:

```bash
vercel env pull .env.local --yes
```

## Neon Auth

Authentication uses [Neon Auth (managed Better Auth)](https://neon.com/docs/auth/overview). Users, sessions, and auth configuration live in your Neon database under the `neon_auth` schema, so no auth tables are managed by this app.

Enable Auth for the project's branch in the [Neon console](https://console.neon.tech) (Project -> Branch -> Auth). The Neon Vercel integration usually enables it automatically and sets `NEON_AUTH_BASE_URL` on the linked project.

The app also needs a cookie-signing secret. Generate one:

```bash
openssl rand -base64 32
```

Add it to every Vercel environment:

```bash
printf '%s' "<generated-secret>" | vercel env add NEON_AUTH_COOKIE_SECRET production preview development
```

Pull the values locally:

```bash
vercel env pull .env.local --yes
```

Both `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` must be present for production mode. `NEON_AUTH_COOKIE_SECRET` must stay secret.

Email and password sign-in works out of the box. To enable social providers (for example Google), configure them in the Neon console under the branch's Auth settings. See the [Neon Auth docs](https://neon.com/docs/auth/overview) for provider configuration.

## Database Migrations

Run production migrations after the first deployment and after any schema change:

```bash
vercel env run -e production -- pnpm db:migrate
```

There is also a package script:

```bash
pnpm db:migrate:production
```

For local development, load `.env.local` before running Drizzle:

```bash
set -a
source .env.local
set +a
pnpm db:migrate
```

For local prototyping only, you can use:

```bash
set -a
source .env.local
set +a
pnpm db:push
```

See the [Vercel env run docs](https://vercel.com/docs/cli/env) for more examples.

## Run Locally

Start the app:

```bash
pnpm dev
```

Or run it on port 3001:

```bash
PORT=3001 pnpm dev -p 3001
```

Open the matching local URL. Neon Auth requests are proxied through the app's own `/api/auth` route, so no callback URL configuration is needed for local ports.

## Deploy

Build locally before deploying:

```bash
pnpm build
```

Deploy to production:

```bash
vercel --prod
```

After changing env vars or storage products, redeploy so production uses the newest project configuration.

## Troubleshooting

If chat is disabled and says setup is required, check the tooltip. Missing migrations will show as `database migrations`. Run:

```bash
vercel env run -e production -- pnpm db:migrate
```

If sign-in redirects to `/auth/error?error=auth_env_missing`, set `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` and redeploy. `NEON_AUTH_BASE_URL` is set by the Neon integration once Auth is enabled for the branch; pull env vars again after enabling it.

If sign-up or sign-in fails with an upstream auth error, confirm Auth is enabled for the correct Neon branch and that the branch's Auth configuration allows email/password sign-in.

If `pnpm db:migrate` says `DATABASE_URL` is missing, either run `vercel env run -e production -- pnpm db:migrate` for production or pull a Development-scoped Neon env var into `.env.local`.

## Useful Links

- [Vercel CLI](https://vercel.com/docs/cli)
- [Vercel env run](https://vercel.com/docs/cli/env)
- [Vercel Marketplace storage](https://vercel.com/docs/storage)
- [Vercel CLI integration commands](https://vercel.com/docs/cli/integration)
- [System environment variables](https://vercel.com/docs/environment-variables/system-environment-variables)
- [Neon Auth overview](https://neon.com/docs/auth/overview)
- [Neon Auth Next.js server SDK](https://neon.com/docs/auth/reference/nextjs-server)
