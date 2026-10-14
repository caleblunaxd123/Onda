import type { ConfigContext, ExpoConfig } from 'expo/config';
// Development (LAN/emulator) builds get their own package id so they install next to the beta and never
// touch its stored session or library.
const development = process.env.APP_VARIANT === 'development';
const googleIosClient = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
export default ({config}:ConfigContext):ExpoConfig => ({
  ...config,
  name: development ? 'ONDA Dev' : 'ONDA', slug:'onda',
  android: {...config.android, package: development ? `${config.android?.package}.dev` : config.android?.package},
  plugins:[...(config.plugins??[]).map(plugin => plugin==='expo-build-properties'
    ? ['expo-build-properties',{android:{usesCleartextTraffic:development}}] as [string, {android: {usesCleartextTraffic: boolean}}]
    : plugin), ...(googleIosClient ? [['react-native-nitro-google-signin', {iosUrlScheme: 'com.googleusercontent.apps.' + googleIosClient.replace('.apps.googleusercontent.com', '')}] as [string, {iosUrlScheme: string}]] : [])],
});
