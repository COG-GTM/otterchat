# otterchat monorepo

pnpm workspace with two apps. Node 24+ and pnpm 10 are required: eve refuses to
start (`eve requires Node.js >=24`), and rolldown/vite's native bindings need
`^20.19 || >=22.12` — pnpm silently skips them on older Node and vite builds
then fail with "Cannot find native binding".

| Package | Path | Notes |
| --- | --- | --- |
| `otterchat` | `apps/chat` | Next.js 16 + eve chat app, Capacitor iOS/Android. See `apps/chat/AGENTS.md` before changing it. |
| `otterchat-twitter` | `apps/twitter` | React 19 + Vite static X post-detail prototype. oxlint. |

- Install once at the root: `pnpm install`. Never add a second lockfile inside
  an app.
- Root scripts fan out: `pnpm build:all`, `pnpm typecheck`, `pnpm lint`.
  Unqualified `pnpm dev`/`pnpm build`/`pnpm start` and the `db:*`, `ios*`,
  `android*` scripts forward to `apps/chat`; `pnpm dev:twitter` runs the
  prototype.
- Target one package with `pnpm --filter <name> <script>`.
- New shared code goes in a `packages/*` workspace package, not in a relative
  import that reaches across `apps/`.
- Vercel's project Root Directory is `apps/chat`; moving or renaming the chat
  app means updating that project setting too.
- Use `eve` lowercase in user-facing copy, docs, prompts, and comments. Do not
  title-case it unless it is part of an exact external title or quoted text.
