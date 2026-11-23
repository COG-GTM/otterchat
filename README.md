# otterchat

pnpm workspace monorepo for otterchat.

| Package | Path | Stack | Description |
| --- | --- | --- | --- |
| `otterchat` | `apps/chat` | Next.js 16 + [eve](https://eve.dev), Capacitor iOS/Android | The chat app. This is what deploys to Vercel. |
| `otterchat-twitter` | `apps/twitter` | React 19 + Vite | Static X (Twitter) post-detail prototype featuring the otterchat account. |

## Getting started

Requires Node 24+ (eve's dev server refuses to start on older Node; vite's
rolldown bindings need `^20.19 || >=22.12`) and pnpm 10.
If `pnpm` is not on your PATH, `corepack enable` installs the version pinned in
`package.json` (`packageManager`).

```bash
pnpm install          # installs every workspace package

pnpm dev              # chat app        → http://localhost:3000
pnpm dev:twitter      # twitter prototype → http://localhost:5173

pnpm build            # build the chat app (what Vercel runs)
pnpm build:all        # build every package
pnpm typecheck        # typecheck every package
pnpm lint             # lint every package
```

`pnpm dev` starts the chat app in local development mode (browser storage, no
database), but the agent cannot reply until it has AI Gateway credentials.
Without them the page loads and every message fails with "AI Gateway received no
credentials". Either put a key from
<https://vercel.com/dashboard/ai/api-keys> in `apps/chat/.env.local`:

```bash
echo 'AI_GATEWAY_API_KEY=<your key>' >> apps/chat/.env.local
```

or run `pnpm exec eve link` from `apps/chat` to link a Vercel project and pull
`VERCEL_OIDC_TOKEN`. Restart `pnpm dev` afterwards.

`pnpm lint` only runs in packages that define a `lint` script (currently
`otterchat-twitter`); the other packages rely on `pnpm typecheck`.

Anything specific to one app can be run through a filter, or from inside its
directory:

```bash
pnpm --filter otterchat-twitter build
cd apps/chat && pnpm dev
```

The chat app's `db:*`, `ios*`, and `android*` scripts are also exposed at the
root and forward to `apps/chat`.

## Per-app docs

- Chat app: [`apps/chat/README.md`](apps/chat/README.md), plus
  [setup and deployment](apps/chat/docs/setup-and-deploy.md) and
  [how the chatbot works](apps/chat/docs/how-the-chatbot-works.md). The
  provisioning script lives at `apps/chat/scripts/setup.sh` and must be run from
  `apps/chat` (it links the Vercel project to that directory).
- Twitter prototype: [`apps/twitter/README.md`](apps/twitter/README.md).

## Deployment

The Vercel project must have its **Root Directory** set to `apps/chat`
(Settings → Build & Deployment → Root Directory), with "Include files outside
the Root Directory" left enabled so the workspace lockfile is used. Vercel then
detects Next.js and builds the chat app as before.

A root `vercel.json` cannot substitute for this: framework detection reads the
package.json of the root directory, and the workspace root has no `next`
dependency.
