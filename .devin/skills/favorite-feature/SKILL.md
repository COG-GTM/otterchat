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
