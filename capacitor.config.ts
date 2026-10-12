import type { CapacitorConfig } from '@capacitor/cli';

const appUrl = process.env.CAPACITOR_SERVER_URL;

if (appUrl && !appUrl.startsWith('https://') && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(appUrl)) {
  throw new Error('CAPACITOR_SERVER_URL must use HTTPS outside local development.');
}

const config: CapacitorConfig = {
  appId: 'com.omegaproblemxexchange.opxe',
  appName: 'OPXE',
  webDir: 'capacitor-www',
  ...(appUrl ? {
    server: {
      url: appUrl,
      cleartext: appUrl.startsWith('http://'),
    },
  } : {}),
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
