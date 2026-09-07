# otterchat

pnpm workspace monorepo for otterchat.

| Package | Path | Stack | Description |
| --- | --- | --- | --- |
| `otterchat` | `apps/chat` | Next.js 16 + [eve](https://eve.dev), Capacitor iOS/Android | The chat app. This is what deploys to Vercel. |
| `otterchat-twitter` | `apps/twitter` | React 19 + Vite | Static X (Twitter) post-detail prototype featuring the otterchat account. |

## Getting started

Requires Node 22 (rolldown/vite native bindings need `^20.19 || >=22.12`) and pnpm 10.

```bash
pnpm install          # installs every workspace package

pnpm dev              # chat app        → http://localhost:3000
pnpm dev:twitter      # twitter prototype → http://localhost:5173

pnpm build            # build the chat app (what Vercel runs)
pnpm build:all        # build every package
pnpm typecheck        # typecheck every package
pnpm lint             # lint every package
```

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

The Vercel project builds the chat app from the repo root using `vercel.json`
(`pnpm --filter otterchat build`, output `apps/chat/.next`). Setting the
project's **Root Directory** to `apps/chat` also works — in that case Vercel
picks up the app's own config and the root `vercel.json` is ignored.
