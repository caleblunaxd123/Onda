import { useEffect, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { player, prepareAudio, usePlayer } from '../src/player';
import { lookupStations } from '../src/catalog';
import { libraryIds, useLibrary } from '../src/library';
import {useTheme} from '../src/theme';
import {OndaAmbientBackground} from '../src/components/experience';
import { deviceCountry } from '../src/region';
import { Label, MiniPlayer } from '../src/ui';
import {initializeSession} from '../src/features/account/session';
import {useLibraryCloudSync} from '../src/features/account/cloud-sync';
import {SafetySync} from '../src/features/account/safety';
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
  const segments = useSegments();
  return <RootShell wide={['room', 'watch'].includes(segments[0] ?? '')}/>;
}
function RootShell({wide}: {wide: boolean}) {
  const c = useTheme(); const [error, setError] = useState('');
  useLibraryRefresh();
  useLibraryCloudSync();
  useEffect(() => {
    void initializeSession();
    prepareAudio().catch(() => setError('No se pudo configurar el audio. Reinicia la aplicación.'));
    const network = NetInfo.addEventListener(s => {const connected = s.isConnected !== false && s.isInternetReachable !== false; onlineManager.setOnline(connected); player.setOnline(connected);});
    if (useLibrary.persist.hasHydrated()) syncCountry();
    const hydration = useLibrary.persist.onFinishHydration(syncCountry);
    const app = AppState.addEventListener('change', state => {player.checkSleep(); if (state === 'active') syncCountry();});
    return () => {network(); app.remove(); hydration();};
  }, []);
  return <GestureHandlerRootView style={{flex: 1, backgroundColor: c.bg}}>
    <View style={[{flex: 1}, Platform.OS === 'web' && {width: '100%', maxWidth: wide ? 1080 : 480, alignSelf: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: c.border}]}>
      <OndaAmbientBackground/>
      <SafeAreaProvider><QueryClientProvider client={queryClient}><SafeAreaView edges={['top']} style={{flex: 1}}>
        <SafetySync/>
        <StatusBar style={c.isDark ? 'light' : 'dark'}/>
        {error ? <View style={{padding: 16}}><Label>{error}</Label></View> : null}
        <Stack screenOptions={{headerShown: false, contentStyle: {backgroundColor: 'transparent'}, animation: 'slide_from_right'}}>
          <Stack.Screen name="(tabs)"/>
          <Stack.Screen name="player" options={{presentation: 'modal', animation: 'slide_from_bottom'}}/>
          <Stack.Screen name="search"/>
          <Stack.Screen name="settings"/>
          <Stack.Screen name="onboarding" options={{animation: 'fade', gestureEnabled: false}}/>
        </Stack>
        <StackPlayerDock/>
      </SafeAreaView></QueryClientProvider></SafeAreaProvider>
    </View>
  </GestureHandlerRootView>;
}

/** Keep audio controls available in Search and Settings as well as the tab screens. */
function StackPlayerDock() {
  const segments = useSegments(); const c = useTheme(); const station = usePlayer().station;
  if (!station || !segments.length || segments[0] === '(tabs)' || segments[0] === 'player' || segments[0] === 'onboarding' || segments[0] === 'room' || segments[0] === 'watch') return null;
  return <SafeAreaView edges={['bottom']} style={{backgroundColor: c.bg}}><MiniPlayer/></SafeAreaView>;
}
