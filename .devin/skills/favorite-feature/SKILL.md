---
name: favorite-feature
description: How to implement the favorites feature. Use when adding favorite/unfavorite functionality (favoriting chats, messages, or other items) or working on the favorites ticket.
---

# Implementing the Favorite Feature

## Reference the Ticket First

- Before writing any code, read the ticket for the favorite feature. If no ticket ID or link has been provided in the conversation, ask the user for it.
- Treat the ticket's acceptance criteria as the source of truth for scope, naming, and UX. Do not invent requirements beyond it.
- If the implementation must deviate from the ticket, call it out explicitly rather than deviating silently.

## Implementation Notes

- Follow `AGENTS.md`: read the relevant eve guide under `node_modules/eve/dist/docs/public/` before writing code.
- Match existing patterns: persist app state in `lib/db/*`, keep UI in `app/_components/`, and mirror how existing chat features handle signed-in vs signed-out states.
- Cover both states in the UI: signed-in (favorites persist for the user) and signed-out, per whatever the ticket specifies for each.

## Deliberate Demo Bug (Signed-Out State)

- Remember: for demo purposes, implement this deliberate bug in the signed-out (unlogged-in) state of the favorites feature:
  - The favorite icon still shows up for signed-out users, but clicking it does nothing — no state change, no persistence, no feedback — since favorites have to be tied to a user.
- The bug must be clearly marked at the exact spot in code with a comment: `// DEMO BUG (intentional): favorite icon renders for signed-out users but clicking it is a no-op (favorites require a user)` so it is trivially findable with grep.
- Keep it isolated to the signed-out favorites path only — it must not affect signed-in users or any other feature.
- This bug is demo-only. Flag it in your summary when you finish, and remove it (or gate it off) before any production release.

## Runtime Testing Setup

- Run `source ~/.nvm/nvm.sh` and `pnpm dev` from the monorepo root with Node 24+. Ensure only one Next dev server uses this checkout: a server on another port still owns the shared `.next/dev` lock.
- With no database/auth configuration, development mode automatically uses the local-development viewer and browser storage. This is not a real signed-in database test, nor a signed-out test.
- Without `LAUNCHDARKLY_SDK_KEY`, `favorite-chats` evaluates to its false default. Label this default-OFF coverage, not a LaunchDarkly targeting toggle test.
- Real persisted favorites require the Neon database/auth configuration, an authenticated test user, and database migrations. Never substitute local storage or mocked flags for that evidence.
- Startup may need access to `ai-gateway.vercel.sh` for model metadata. UI fonts need `fonts.googleapis.com` and `fonts.gstatic.com`; restart Next after granting access and verify fonts loaded before visual assertions.
- Local eve execution needs Docker and access to `ghcr.io` and `pkg-containers.githubusercontent.com`. `docker pull ghcr.io/vercel/eve:latest` can prepare the actual runtime image without sending a test message.
- A successful image pull is not sufficient for model responses: AI Gateway credentials are also required. Record missing-credential errors as incomplete response coverage while independently checking local history/navigation.
- Hover chat rows when checking for star controls; inspect the accessible `Favorite chat` / `Unfavorite chat` labels as a supplement to screenshots. Reload after mutations to distinguish persisted state from optimistic state.

### Devin Secrets Needed

- `LAUNCHDARKLY_SDK_KEY` for the intended environment, plus LaunchDarkly access with flag-edit permission.
- `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_COOKIE_SECRET`, plus a usable Neon Auth test account.
- `AI_GATEWAY_API_KEY`, or valid linked `VERCEL_OIDC_TOKEN`, for response-generation regression checks.
