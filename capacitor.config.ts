import type { CapacitorConfig } from '@capacitor/cli';

/**
 * DataDungeon — native iOS shell.
 *
 * The app loads the live deployed CRM (server.url) rather than a bundled copy,
 * so every Netlify deploy reaches the iPad/iPhone immediately with no rebuild
 * and no reinstall. `webDir` is still required by the CLI and is used as the
 * fallback bundle baked into the binary.
 */
const config: CapacitorConfig = {
  appId: 'au.com.gregleighproperty.datadungeon',
  appName: 'DataDungeon',
  webDir: 'dist',
  server: {
    url: 'https://tiny-brioche-b979f7.netlify.app',
    cleartext: false,
  },
  ios: {
    // Let the web app own the full canvas; it already handles safe areas.
    contentInset: 'never',
    backgroundColor: '#0f1219',
    // Supabase auth + Google/Microsoft OAuth redirects must not be blocked.
    limitsNavigationsToAppBoundDomains: false,
    scrollEnabled: true,
  },
};

export default config;
