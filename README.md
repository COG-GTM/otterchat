# twitter-otterchat

Static recreation of an X (Twitter) post detail page: left navigation, post thread with replies, and the right rail (search, relevant people, trends, footer).

Content lives in `src/data.ts`. Trends, replies, and the footer are placeholder data drawn as inline SVG gradients; the post itself features the Otterchat account, whose avatar and media come from real assets in `src/assets/`. The signed-in account (`currentUser`) is a named sample user for demo purposes.

## Stack

React 19 + TypeScript + Vite.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint     # oxlint
```

## Layout

Column widths mirror X's desktop layout: 275px navigation, 600px timeline, 350px right rail, centered in a 1265px container.

| Path | Purpose |
| --- | --- |
| `src/data.ts` | All placeholder content (accounts, post, replies, trends, footer). |
| `src/components/LeftNav.tsx` | Logo, nav items, Post button, account switcher. |
| `src/components/PostPage.tsx` | Post header, media, metrics, action bar, reply composer, replies. |
| `src/components/RightRail.tsx` | Search, Relevant people, What's happening, footer links. |
| `src/components/PrototypeToolbar.tsx` | Non-diegetic Back/Next flow chrome (not part of the X UI); holds the flow step in component state. |
| `src/components/Icons.tsx` | Hand-rolled SVG icon set. |
| `src/components/Avatar.tsx`, `src/components/Media.tsx` | SVG placeholder avatars and media. |
| `src/App.css` | Layout and component styles. |
