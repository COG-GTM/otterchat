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

- Run from the repo root with Node 24 (`source ~/.nvm/nvm.sh && nvm use 24`), then `pnpm dev`. Only one Next dev server may use this checkout: a server on another port still owns the shared `.next/dev` lock.
- With no production environment, development mode automatically supplies an `eve user` viewer and browser storage. This is not a real Neon sign-in or a truly signed-out session; label coverage accordingly.
- Database-mode tests require all three production settings below and migrated tables. Do not simulate auth/DB to claim persistence coverage.
- Without `LAUNCHDARKLY_SDK_KEY`, the helper returns the caller's default. If authorized to temporarily flip a default, restore it and verify both source and refreshed UI before finishing.
- Create browser chat fixtures through the composer. A failed model request may still leave the local chat row usable for sidebar-only tests; disclose the request failure and do not claim message/reply coverage.
- If eve auto-start fails resolving model metadata, `EVE_BASE_URL` can decouple Next.js from auto-start. Point it at a real running backend for full tests; an unavailable local backend only permits explicitly limited frontend tests, not end-to-end backend claims.
- Star/actions buttons support keyboard focus visibility. If the test browser reports `(hover:hover)=false`, click an already-selected chat row and press Tab to reveal its first action; report hover coverage separately rather than changing CSS.
- Network restrictions may force Google Fonts fallbacks; do not claim pixel-exact visual parity in that case. Fonts need `fonts.googleapis.com` and `fonts.gstatic.com`, startup needs `ai-gateway.vercel.sh` for model metadata, and the local eve runtime image needs `ghcr.io` plus `pkg-containers.githubusercontent.com`; restart Next after granting access.
- A reachable AI Gateway is not enough for model responses: credentials are also required (`AI Gateway received no credentials` otherwise). Record that as incomplete response coverage and still check sidebar, history, and navigation independently.
- Reload after mutations to distinguish persisted state from optimistic state, and inspect the accessible `Favorite chat` / `Unfavorite chat` labels as a supplement to screenshots.
- Package docs may be at `apps/chat/node_modules/eve/docs/` when the older `dist/docs/public/` location is absent.

### Devin Secrets Needed

- `DATABASE_URL`
- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`
- `LAUNCHDARKLY_SDK_KEY` for actual remote flag evaluation (not needed for authorized local-default tests).
- A usable Neon test account or permitted self-registration for signed-in scenarios.
- `AI_GATEWAY_API_KEY`, or a valid linked `VERCEL_OIDC_TOKEN`, for response-generation regression checks.
