import {useEffect, useRef, useState} from 'react';
import {View} from 'react-native';
import {router, useLocalSearchParams} from 'expo-router';
import {useLibrary, useLibraryHydrated} from './library';
import {player, prepareAudio, isActive} from './player';
import {Button, Label, Muted, Page, ScreenHeader} from './ui';

/** An external shortcut can only resolve a saved favorite, never an arbitrary stream URL. */
export default function QuickPlay() {
  const {id} = useLocalSearchParams<{id?: string | string[]}>(); const hydrated = useLibraryHydrated();
  const station = useLibrary(s => s.favorites.find(item => item.id === id));
  const [error, setError] = useState(''); const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const key = typeof id === 'string' ? id : '';
    if (handled.current === key) return;
    handled.current = key;
    if (!station) return;
    let disposed = false;
    prepareAudio().then(() => {
      if (disposed) return;
      const current = player.getSnapshot();
      if (current.station?.id !== station.id || !isActive(current.state)) player.select(station);
      router.replace('/player');
    }).catch(() => {if (!disposed) {handled.current = null; setError('No se pudo abrir el audio. Intenta desde tu biblioteca.');}});
    return () => {disposed = true; handled.current = null;};
  }, [hydrated, id, station]);
  const message = error || (hydrated && !station ? 'Esta emisora ya no está en tus favoritas. Elige otra desde tu biblioteca.' : '');
  return <View style={{flex: 1}}><ScreenHeader title="Tus favoritas" back/><Page><Label>{message || 'Abriendo tu emisora…'}</Label>{message ? <><Muted>Tu biblioteca se conserva.</Muted><Button title="Ir a mi biblioteca" onPress={() => router.replace('/library')}/></> : null}</Page></View>;
}
