import type { ConfigContext, ExpoConfig } from 'expo/config';
export default ({config}:ConfigContext):ExpoConfig => ({
  ...config,
  name:'ONDA', slug:'onda',
  plugins:(config.plugins??[]).map(plugin => plugin==='expo-build-properties'
    ? ['expo-build-properties',{android:{usesCleartextTraffic:process.env.APP_VARIANT==='development'}}]
    : plugin),
});
