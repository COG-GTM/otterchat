import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

// live webview: loads `next dev` by default; set CAP_SERVER_URL for prod builds
const serverUrl = process.env.CAP_SERVER_URL ?? 'http://localhost:3000';

const config: CapacitorConfig = {
  appId: 'com.otterchat.app',
  appName: 'otterchat',
  webDir: 'mobile/www',
  ios: {
    path: 'mobile/ios',
  },
  android: {
    path: 'mobile/android',
  },
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
  },
  plugins: {
    // installed for its native side effect: hides the stranded iOS 26 accessory bar
    Keyboard: {
      resize: KeyboardResize.Native,
    },
  },
};

export default config;
