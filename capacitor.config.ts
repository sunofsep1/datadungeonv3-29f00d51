import type { CapacitorConfig } from '@capacitor/cli';

// Native shell loads the LIVE deployed CRM — every Netlify deploy reaches the
// installed app without a new TestFlight build.
const config: CapacitorConfig = {
  appId: 'au.com.gregleighproperty.datadungeon',
  appName: 'DataDungeon',
  webDir: 'dist',
  server: {
    url: 'https://tiny-brioche-b979f7.netlify.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#0f1219',
    limitsNavigationsToAppBoundDomains: false,
    scrollEnabled: true,
  },
};

export default config;
