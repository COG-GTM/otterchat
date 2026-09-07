# eve Agent App (`apps/chat`)

This is the chat app inside the otterchat pnpm workspace; see the root
`AGENTS.md` for monorepo layout and commands. Run the commands below from this
directory (or with `pnpm --filter otterchat <script>` from the root).

This project uses the eve framework. Before writing code, always read the relevant guide in `node_modules/eve/dist/docs/public/`.

Use `eve` lowercase in user-facing copy, docs, prompts, and comments. Do not
title-case it unless it is part of an exact external title or quoted text.

## iOS + Android (Capacitor)

The native apps are live webviews: `capacitor.config.ts` points `server.url` at
the web app (defaults to `http://localhost:3000`; set `CAP_SERVER_URL` for prod
builds). Everything mobile lives under `mobile/` (`mobile/ios`, `mobile/android`
via the `ios.path`/`android.path` config options, and `mobile/www` as a
placeholder webDir — no assets are bundled). Only `capacitor.config.ts` stays at
the app root, where the cap CLI expects it.

- `pnpm dev` then `pnpm ios` — run in the iOS simulator (HMR works in-app)
- `pnpm dev`, start an emulator, then `pnpm android` — run on Android. The
  script runs `adb reverse tcp:3000 tcp:3000` first so the app keeps an
  `http://localhost` origin (a secure context; `10.0.2.2` breaks WebCrypto and
  crypto.randomUUID). The reverse resets when the emulator restarts, so always
  launch via `pnpm android`, and boot the emulator/device before running it.
- `pnpm ios:sync` / `pnpm android:sync` — sync config/plugins after changes
- `pnpm ios:open` / `pnpm android:open` — open in Xcode / Android Studio
- Android Gradle builds need JDK 21; the `pnpm android` script sets JAVA_HOME
  to Android Studio's bundled JDK. `mobile/android/local.properties`
  (gitignored) points at the SDK.
- Physical devices: iOS needs `next dev -H 0.0.0.0` and `CAP_SERVER_URL` set to
  the Mac's LAN IP + `pnpm ios:sync`; Android over USB works with plain
  `pnpm android` since `adb reverse` covers it. Prefer https URLs for
  `CAP_SERVER_URL` — plain http LAN IPs are not secure contexts.
- New Capacitor plugins require a platform sync and ship with the app binary
- `@capacitor/keyboard` is installed purely for its native iOS side effects (no
  JS imports anywhere): it hides the form accessory bar by default (iOS 26
  strands that floating prev/next/done capsule on screen after keyboard
  dismissal) and owns keyboard resizing (`resize: native` shrinks the webview
  so the composer sits flush above the keyboard)
- Safe areas are handled with `viewport-fit=cover` + `env(safe-area-inset-*)`
  CSS (no Capacitor plugin); keep skeletons in `agent-chat-skeleton.tsx` in
  sync with shell padding changes

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
