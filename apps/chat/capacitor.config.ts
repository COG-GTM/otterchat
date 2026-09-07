import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

// Live-webview setup: the native app loads the web app from a server URL
// instead of bundled assets.
//   - dev (default): your local `next dev` server. Android reaches it through
//     `adb reverse tcp:3000 tcp:3000` (wired into `pnpm android`) so both
//     platforms keep an `http://localhost` origin — a secure context, which
//     APIs like crypto.randomUUID and WebCrypto require.
//   - prod builds:   set CAP_SERVER_URL to the deployed URL before `cap sync`,
//                    e.g. CAP_SERVER_URL=https://otterchat.example.com npx cap sync ios
const serverUrl = process.env.CAP_SERVER_URL ?? 'http://localhost:3000';

const config: CapacitorConfig = {
  appId: 'com.otterchat.app',
  appName: 'otterchat',
  // Placeholder only — real content is served from `server.url`.
  webDir: 'mobile/www',
  ios: {
    path: 'mobile/ios',
  },
  android: {
    path: 'mobile/android',
  },
  server: {
    url: serverUrl,
    // Allow plain http for local dev; harmless for https prod URLs.
    cleartext: serverUrl.startsWith('http://'),
  },
  plugins: {
    // @capacitor/keyboard is installed for its native iOS side effects — no JS
    // import needed. Just being present, it hides the form accessory bar (the
    // floating prev/next/done capsule that iOS 26 leaves stranded on screen
    // after the keyboard closes) and takes over keyboard resize handling.
    Keyboard: {
      // Resize the webview itself (the default, kept explicit): dvh units
      // shrink with the keyboard so the composer sits flush above it, and the
      // frame restores cleanly on dismiss.
      resize: KeyboardResize.Native,
    },
  },
};

export default config;
