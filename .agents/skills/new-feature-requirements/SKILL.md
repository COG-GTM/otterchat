---
name: new-feature-requirements
description: Requirements for features that a Devin Automation builds in otterchat, starting with shipping behind a LaunchDarkly flag that is on in Vercel preview deployments and off in production. Use only when the current session was started by a Devin Automation (scheduled or event-triggered) and it adds a feature, page, component, endpoint, or behavior change, or when asked to gate, roll out, or clean up a feature flag.
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

The flag is served **on in Vercel preview deployments** and off everywhere else, so
reviewers see the feature on the PR's preview URL without it reaching production.

## Setup already in place

- Package: `@launchdarkly/node-server-sdk` (server-side SDK, evaluated in server components and route handlers)
- Client singleton and helper: `lib/launchdarkly.ts`
- Flag declarations: `lib/flags.ts`, built with `launchDarklyFlag` from `lib/launchdarkly-flag.ts`
- Credentials: `LAUNCHDARKLY_SDK_KEY` and `FLAGS_SECRET` in `.env.local` (gitignored), placeholders
  in `.env.example`. Both are set on the Vercel project; pull them with `vercel env pull`.
  Never hardcode them.
- Vercel sets one `LAUNCHDARKLY_SDK_KEY` for production, preview, and development, so all
  Vercel deployments read the same LaunchDarkly environment. The key in a local `.env.local`
  reads the `test` environment. Previews are therefore told apart by context, not by
  environment: `boolVariation` in `lib/launchdarkly.ts` adds a `deployment` context whose key
  is `VERCEL_ENV` (`production`, `preview`, or `development` when unset).

`boolVariation` returns the supplied default when the key is missing or the SDK cannot
initialize, so the app still runs with no LaunchDarkly credentials configured.

## Workflow for an automation-built feature

1. Pick a kebab-case flag key that names the feature, e.g. `chat-attachments`.
2. Create the flag in LaunchDarkly before wiring it up (boolean, project `default`, tag
   `otterchat`), with the LaunchDarkly MCP (`create-flag`) or at
   `https://app.launchdarkly.com/projects/default/flags/new?key=<flag-key>`. Confirm the
   project key if it is not `default`.
3. Serve it on for preview deployments only. Apply the same configuration in **both** the
   `production` and `test` environments, so it holds whichever environment a key reads:
   1. Add a targeting rule (`update-targeting-rules`, `addRule`) that serves the `true`
      variation when context kind `deployment`, attribute `key`, is one of `["preview"]`:

      ```json
      {"kind":"addRule","description":"Vercel preview deployments","clauses":[{"contextKind":"deployment","attribute":"key","op":"in","values":["preview"]}],"variationId":"<true variation _id from get-flag>"}
      ```

   2. Set the default rule (fallthrough) to `false` (`update-rollout` with
      `rolloutType: "variation"` and the `false` variation's index, which is `1` for
      boolean flags). New flags default the fallthrough to `true`, so this step is required.
   3. Leave the off variation as `false`, then turn targeting on (`toggle-flag`, `on: true`).
   4. Confirm with `get-flag`: `on: true`, one rule serving `true` for `deployment` `preview`,
      and both the fallthrough and the off variation `false`.

   Production and local development then evaluate to `false`, and every preview deployment
   (any branch) evaluates to `true`. Never turn the flag on with a `true` fallthrough to get
   the preview working: that ships the feature to production as soon as the code merges.
4. Declare the flag in `lib/flags.ts` so it shows up in the Vercel Toolbar's Flags Explorer:

   ```ts
   import { launchDarklyFlag } from "@/lib/launchdarkly-flag";

   export const chatAttachments = launchDarklyFlag({
     key: "chat-attachments",
     description: "Attachments in the composer",
   });
   ```

5. Evaluate the flag on the server, as close to the feature boundary as possible:

   ```ts
   import { chatAttachments } from "@/lib/flags";

   const enabled = await chatAttachments();
   ```

   The declaration evaluates through `boolVariation`, so LaunchDarkly stays the source of
   truth while the toolbar can override the value for your own browser. Calling
   `boolVariation` directly still works but is invisible to the Flags Explorer.

6. Render or run the new behavior only when `enabled` is true, and keep the previous
   behavior on the false branch. Never let the flag change the shape of persisted data
   without a fallback for flag-off reads.
7. Because `cacheComponents` is enabled in `next.config.ts`, flag evaluation is dynamic:
   wrap the gated server component in `<Suspense>` so the static shell still renders.
8. Pass a real context when the feature targets users. The default context is anonymous:

   ```ts
   export const chatAttachments = launchDarklyFlag({
     key: "chat-attachments",
     description: "Attachments in the composer",
     identify: async () => ({ kind: "user", key: (await getViewer()).id }),
   });
   ```

9. Mention the flag key and its default in the PR description so it can be rolled out and
   later removed. Note that the flag is on in preview deployments, so the preview URL shows
   the feature.

## Rules

- Default off. A flag that defaults to on is not a rollout guard, and an automation must
  never ship a default-on flag. The code default and the fallthrough in every environment
  stay `false`; the preview rule is the only thing that serves `true`.
- Rolling out to production is a human decision: they change the fallthrough to `true` (or a
  percentage). An automation never does.
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

Local dev evaluates as `deployment` `development`, so a new flag is off. To see what a
preview deployment sees, start the server with `VERCEL_ENV=preview pnpm dev`.

Targeting changes at
`https://app.launchdarkly.com/projects/default/flags/<flag-key>/targeting?env=test` (the
environment the local key reads) reach the running server through streaming without a
restart.

For a per-browser override instead, open the Vercel Toolbar (bottom of the page in `pnpm dev`)
→ Flags Explorer, and pick a value. That needs `FLAGS_SECRET` in `.env.local`.
