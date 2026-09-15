---
name: new-feature-requirements
description: Requirements for features that a Devin Automation builds in otterchat, starting with shipping behind a LaunchDarkly flag. Use only when the current session was started by a Devin Automation (scheduled or event-triggered) and it adds a feature, page, component, endpoint, or behavior change, or when asked to gate, roll out, or clean up a feature flag.
---

# New feature requirements (Devin Automations)

## When this applies

Only to work produced by a **Devin Automation** — a session started by a schedule or an
integration event rather than by a person. A session is an automation run when it began
without a human prompt, e.g. it opens with the automation's own instructions and no
interactive requester. If a person started the session and is steering it, this skill does
not apply: gate the feature only if they ask for it.

An automation that ships a user-facing feature must put it behind a LaunchDarkly boolean
flag that defaults to off. The flag is created before the feature merges, and the code path
without the flag must be the current behavior. The point is that unattended changes never
alter production behavior until a human turns them on.

## Setup already in place

- Package: `@launchdarkly/node-server-sdk` (server-side SDK, evaluated in server components and route handlers)
- Client singleton and helper: `lib/launchdarkly.ts`
- Flag declarations: `lib/flags.ts`, built with `launchDarklyFlag` from `lib/launchdarkly-flag.ts`
- Credentials: `LAUNCHDARKLY_SDK_KEY` and `FLAGS_SECRET` in `.env.local` (gitignored), placeholders
  in `.env.example`. Both are set on the Vercel project; pull them with `vercel env pull`.
  Never hardcode them.

`boolVariation` returns the supplied default when the key is missing or the SDK cannot
initialize, so the app still runs with no LaunchDarkly credentials configured.

## Workflow for an automation-built feature

1. Pick a kebab-case flag key that names the feature, e.g. `chat-attachments`.
2. Create the flag in LaunchDarkly before wiring it up:
   `https://app.launchdarkly.com/projects/default/flags/new?key=<flag-key>` (boolean, off in
   every environment). Confirm the project key if it is not `default`.
3. Declare the flag in `lib/flags.ts` so it shows up in the Vercel Toolbar's Flags Explorer:

   ```ts
   import { launchDarklyFlag } from "@/lib/launchdarkly-flag";

   export const chatAttachments = launchDarklyFlag({
     key: "chat-attachments",
     description: "Attachments in the composer",
   });
   ```

4. Evaluate the flag on the server, as close to the feature boundary as possible:

   ```ts
   import { chatAttachments } from "@/lib/flags";

   const enabled = await chatAttachments();
   ```

   The declaration evaluates through `boolVariation`, so LaunchDarkly stays the source of
   truth while the toolbar can override the value for your own browser. Calling
   `boolVariation` directly still works but is invisible to the Flags Explorer.

5. Render or run the new behavior only when `enabled` is true, and keep the previous
   behavior on the false branch. Never let the flag change the shape of persisted data
   without a fallback for flag-off reads.
6. Because `cacheComponents` is enabled in `next.config.ts`, flag evaluation is dynamic:
   wrap the gated server component in `<Suspense>` so the static shell still renders.
7. Pass a real context when the feature targets users. The default context is anonymous:

   ```ts
   export const chatAttachments = launchDarklyFlag({
     key: "chat-attachments",
     description: "Attachments in the composer",
     identify: async () => ({ kind: "user", key: (await getViewer()).id }),
   });
   ```

8. Mention the flag key and its default in the PR description so it can be rolled out and
   later removed.

## Rules

- Default off. A flag that defaults to on is not a rollout guard, and an automation must
  never ship a default-on flag.
- One flag per feature. Do not reuse an existing key for unrelated behavior.
- Do not evaluate flags in client components with this SDK; it is server-side only. If a
  client component needs the value, evaluate it on the server and pass it down as a prop.
- Do not create a new LaunchDarkly client. Import the helper from `lib/launchdarkly.ts`.
- Remove the flag and the dead branch once the feature is fully rolled out.

## Relationship to the Flags SDK

LaunchDarkly remains the only flag provider. The Flags SDK (`flags`) sits on top of it purely
so the Vercel Toolbar can list the flags and override them locally:

- `lib/launchdarkly-flag.ts` wraps `flag()` with a `decide` that calls `boolVariation`, and
  points `origin` at the flag's LaunchDarkly targeting page.
- `lib/flags.ts` holds the declarations; `app/.well-known/vercel/flags/route.ts` serves them
  to the Flags Explorer and is authorized with `FLAGS_SECRET`.
- A toolbar override only affects the browser that set it. Changing the value for everyone
  still happens in LaunchDarkly.

The `@flags-sdk/launchdarkly` adapter is deliberately not used: it needs a client-side ID and
a Vercel Edge Config (`GLOBAL_CONFIG`), and would duplicate the existing server SDK client.

## Verifying locally

```bash
pnpm dev   # requires Node >= 24
```

Toggle the flag at
`https://app.launchdarkly.com/projects/default/flags/<flag-key>/targeting?env=test` and
refresh the page. Streaming updates reach the running server without a restart.

For a per-browser override instead, open the Vercel Toolbar (bottom of the page in `pnpm dev`)
→ Flags Explorer, and pick a value. That needs `FLAGS_SECRET` in `.env.local`.
