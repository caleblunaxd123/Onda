import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import {DarkTheme, DefaultTheme, Stack, ThemeProvider} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { player, prepareAudio } from '../src/player';
import { lookupStations } from '../src/catalog';
import { libraryIds, useLibrary } from '../src/library';
import { useTheme } from '../src/theme';
import { deviceCountry } from '../src/region';
import { Label } from '../src/ui';
import WebShell from '../src/web/shell';
import {OndaAmbientBackground} from '../src/ambient';
import {watchNowPlaying, type MetadataReply} from '../src/now-playing';
import {request} from '../src/api';
import {watchQuickAccess} from '../src/quick-access';
const queryClient = new QueryClient();
const REFRESH_EVERY_MS = 24 * 60 * 60 * 1000;

/** Refreshes saved snapshots (logos, streams, names) once a day without ever removing saved stations. */
function useLibraryRefresh() {
  const hydrated = useLibrary.persist.hasHydrated();
  useEffect(() => {
    const run = () => {
      const state = useLibrary.getState();
      const ids = libraryIds(state);
      if (!ids.length || Date.now() - state.refreshedAt < REFRESH_EVERY_MS) return;
      lookupStations(ids).then(updated => useLibrary.getState().refreshStations(updated)).catch(() => {});
    };
    if (hydrated) run();
    return useLibrary.persist.onFinishHydration(run);
  }, [hydrated]);
}

/** Keeps the listening country aligned with where the device is (time zone), unless chosen manually. */
function syncCountry() {
  const detected = deviceCountry();
  if (detected) useLibrary.getState().syncDeviceCountry(detected.code);
}

export default function RootLayout() {
  const c = useTheme(); const [error, setError] = useState('');
  useLibraryRefresh();
  useEffect(() => {
    prepareAudio().catch(() => setError('No se pudo configurar el audio. Reinicia la aplicación.'));
    const quickAccess = watchQuickAccess();
    const metadata = watchNowPlaying(player, (path, signal) => request<MetadataReply>(path, {signal, timeoutMs: 12000}));
    const network = NetInfo.addEventListener(s => {const connected = s.isConnected !== false && s.isInternetReachable !== false; onlineManager.setOnline(connected); player.setOnline(connected);});
    if (useLibrary.persist.hasHydrated()) syncCountry();
    const hydration = useLibrary.persist.onFinishHydration(syncCountry);
    const app = AppState.addEventListener('change', state => {player.checkSleep(); if (state === 'active') syncCountry();});
    return () => {quickAccess(); metadata(); network(); app.remove(); hydration();};
  }, []);
  return <GestureHandlerRootView style={{flex: 1, backgroundColor: c.bg}}>
    <View style={{flex: 1, width: '100%'}}>
      <SafeAreaProvider><QueryClientProvider client={queryClient}><SafeAreaView edges={['top']} style={{flex: 1, backgroundColor: c.bg}}>
        <OndaAmbientBackground/><ThemeProvider value={{...(c.isDark ? DarkTheme : DefaultTheme), colors: {...(c.isDark ? DarkTheme : DefaultTheme).colors, background: 'transparent', card: c.bg, text: c.text, border: c.border, primary: c.primary}}}><WebShell><StatusBar style={c.isDark ? 'light' : 'dark'}/>
        {error ? <View style={{padding: 16}}><Label>{error}</Label></View> : null}
        <Stack screenOptions={{headerShown: false, contentStyle: {backgroundColor: 'transparent'}, animation: 'slide_from_right'}}>
          <Stack.Screen name="(tabs)"/>
          <Stack.Screen name="player" options={{presentation: 'modal', animation: 'slide_from_bottom'}}/>
          <Stack.Screen name="search"/>
          <Stack.Screen name="settings"/>
          <Stack.Screen name="backup"/>
          <Stack.Screen name="quick-play" options={{animation: 'none'}}/>
          <Stack.Screen name="onboarding" options={{animation: 'fade', gestureEnabled: false}}/>
        </Stack></WebShell></ThemeProvider>
      </SafeAreaView></QueryClientProvider></SafeAreaProvider>
    </View>
  </GestureHandlerRootView>;
}
