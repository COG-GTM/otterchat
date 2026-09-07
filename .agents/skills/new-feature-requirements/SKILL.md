---
name: new-feature-requirements
description: Requirements every new feature in otterchat must meet, starting with shipping behind a LaunchDarkly flag. Use when adding a new feature, page, component, endpoint, or behavior change, or when asked to gate, roll out, or clean up a feature flag.
---

# New feature requirements

Every new user-facing feature in this repo ships behind a LaunchDarkly boolean flag that
defaults to off. The flag is created before the feature merges, and the code path without
the flag must be the current behavior.

## Setup already in place

- Package: `@launchdarkly/node-server-sdk` (server-side SDK, evaluated in server components and route handlers)
- Client singleton and helper: `lib/launchdarkly.ts`
- Credentials: `LAUNCHDARKLY_SDK_KEY` in `.env.local` (gitignored), placeholder in `.env.example`.
  It is stored as a repo-scoped Devin secret named `LAUNCHDARKLY_SDK_KEY`; never hardcode it.

`boolVariation` returns the supplied default when the key is missing or the SDK cannot
initialize, so the app still runs with no LaunchDarkly credentials configured.

## Workflow for a new feature

1. Pick a kebab-case flag key that names the feature, e.g. `chat-attachments`.
2. Create the flag in LaunchDarkly before wiring it up:
   `https://app.launchdarkly.com/projects/default/flags/new?key=<flag-key>` (boolean, off in
   every environment). Confirm the project key if it is not `default`.
3. Evaluate the flag on the server, as close to the feature boundary as possible:

   ```ts
   import { boolVariation } from "@/lib/launchdarkly";

   const enabled = await boolVariation("chat-attachments", false);
   ```

4. Render or run the new behavior only when `enabled` is true, and keep the previous
   behavior on the false branch. Never let the flag change the shape of persisted data
   without a fallback for flag-off reads.
5. Because `cacheComponents` is enabled in `next.config.ts`, flag evaluation is dynamic:
   wrap the gated server component in `<Suspense>` so the static shell still renders.
6. Pass a real context when the feature targets users. The default context is anonymous:

   ```ts
   await boolVariation("chat-attachments", false, { kind: "user", key: viewer.id });
   ```

7. Mention the flag key and its default in the PR description so it can be rolled out and
   later removed.

## Rules

- Default off. A flag that defaults to on is not a rollout guard.
- One flag per feature. Do not reuse an existing key for unrelated behavior.
- Do not evaluate flags in client components with this SDK; it is server-side only. If a
  client component needs the value, evaluate it on the server and pass it down as a prop.
- Do not create a new LaunchDarkly client. Import the helper from `lib/launchdarkly.ts`.
- Remove the flag and the dead branch once the feature is fully rolled out.

## Relationship to the Flags SDK

`lib/flags.ts` uses the Vercel Flags SDK (`flags`, `@flags-sdk/vercel`) and is separate from
this integration. Use LaunchDarkly for new feature gating unless a task explicitly asks for
Vercel Flags. If both are ever needed in one flag declaration, the LaunchDarkly adapter is
`@flags-sdk/launchdarkly`, which additionally requires `GLOBAL_CONFIG` (Vercel Edge Config).

## Verifying locally

```bash
pnpm dev   # requires Node >= 24
```

Toggle the flag at
`https://app.launchdarkly.com/projects/default/flags/<flag-key>/targeting?env=test` and
refresh the page. Streaming updates reach the running server without a restart.
