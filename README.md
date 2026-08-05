# twitter-otterchat

Static recreation of an X (Twitter) post detail page: left navigation, post thread with replies, and the right rail (search, relevant people, trends, footer).

All content is placeholder data — post copy, trends, and images are stand-ins, and images are inline SVG gradients rather than real media. The signed-in account (`currentUser` in `src/data.ts`) is a named sample user for demo purposes.

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
| `src/components/Icons.tsx` | Hand-rolled SVG icon set. |
| `src/components/Avatar.tsx`, `src/components/Media.tsx` | SVG placeholder avatars and media. |
| `src/App.css` | Layout and component styles. |
