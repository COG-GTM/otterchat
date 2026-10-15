# otterchat-twitter

Static recreation of an X (Twitter) post detail page: left navigation, post thread with replies, and the right rail (search, relevant people, trends, footer).

Content lives in `src/data.ts`. Trends, replies, and the footer are placeholder data drawn as inline SVG gradients; the post itself features the Otterchat account, whose avatar and media come from real assets in `src/assets/`. The signed-in account (`currentUser`) is a named sample user for demo purposes.

## Stack

React 19 + TypeScript + Vite.

## Getting started

This app is a package in the otterchat pnpm workspace; install from the repo
root.

```bash
pnpm install                 # at the repo root
pnpm dev:twitter             # http://localhost:5173

# or, from this directory
pnpm dev
pnpm build                   # type-check + production build
pnpm lint                    # oxlint
```

## Layout

Column widths mirror X's desktop layout: 275px navigation, 600px timeline, 350px right rail, centered in a 1265px container.

| Path | Purpose |
| --- | --- |
| `src/data.ts` | All placeholder content (accounts, post, replies, trends, footer). |
| `src/components/LeftNav.tsx` | Logo, nav items, Post button, account switcher. |
| `src/components/PostPage.tsx` | Post header, media, metrics, action bar, reply composer, replies. |
| `src/components/RightRail.tsx` | Search, Relevant people, What's happening, footer links. |
| `src/components/PrototypeToolbar.tsx` | Non-diegetic Back/Next flow chrome (not part of the X UI); controlled by the flow step `App` owns, which decides how many replies `PostPage` renders. |
| `src/components/Icons.tsx` | Hand-rolled SVG icon set. |
| `src/components/Avatar.tsx`, `src/components/Media.tsx` | SVG placeholder avatars and media. |
| `src/App.css` | Layout and component styles. |

## API routes (Vercel Functions)

| Route | Purpose |
| --- | --- |
| `POST /api/fire-feedback` | Sends the prototype's replies to the OtterChat Twitter Monitor automation. |
| `GET /api/relay` | Answers X's CRC challenge (`crc_token` → `response_token`). |
| `POST /api/relay` | Verifies `x-twitter-webhooks-signature`, keeps `tweet_create_events` from other accounts, and forwards them to the same automation as one `{ source, post, feedback[] }` request per delivery; each item's `inReplyTo` holds its parent post, and `post` is set when they all share one. |

Register `https://twitter-otterchat.vercel.app/api/relay` as the X webhook URL, not the Devin automation URL: X's CRC `GET` carries no `X-Webhook-Secret`, so Devin rejects it with 401.

Env: `OTTERCHAT_TWITTER_WEBHOOK_SECRET` (automation's webhook secret), `X_CONSUMER_SECRET` (X app's API key secret), optional `OTTERCHAT_TWITTER_WEBHOOK_URL`. `vite dev` serves both routes.
