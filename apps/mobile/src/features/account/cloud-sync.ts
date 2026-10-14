import {useEffect} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {ApiError} from '../../api';
import {lookupStations} from '../../catalog';
import {useLibrary} from '../../library';
import type {Station} from '../../types';
import {accountRequest, useAuth} from './session';
import {emptySaved, mergeSaved, type LibraryEnvelope, type SavedLibrary} from './merge';

export const useCloudSync = create<{busy: boolean; error: string; lastSync: number | null}>(() => ({busy: false, error: '', lastSync: null}));
const snapshot = (): SavedLibrary => {
  const l = useLibrary.getState();
  if (l.favorites.length > 500 || l.collections.length > 50 || l.collections.some(x => x.stations.length > 500) || l.favorites.length + l.collections.reduce((sum, x) => sum + x.stations.length, 0) + (l.syncHistory ? l.history.length : 0) > 10000)
    throw new Error('La sincronización admite 500 favoritos, 50 colecciones y 10.000 referencias. Tu biblioteca completa se mantiene en este dispositivo; reduce la selección para sincronizar.');
  return {favorites: l.favorites.map(x => x.id), history: l.syncHistory ? l.history.map(x => x.id) : null,
    collections: l.collections.map(x => ({id: x.id, name: x.name, stations: x.stations.map(s => s.id)})),
    media: l.mediaFavorites.filter(x => x.media.kind !== 'radio' && x.media.url).map(x => ({id: x.id, kind: x.media.kind as 'youtube' | 'audio' | 'video', url: x.media.url!, title: x.media.title, category: x.media.category ?? ''}))};
};
let flight: Promise<void> | null = null;
export function syncLibrary(): Promise<void> {
  if (flight) return flight;
  const session = useAuth.getState().session;
  if (!session || session.user.guest || useLibrary.getState().syncAccountId !== session.user.id) return Promise.resolve();
  const userId = session.user.id;
  let committed: SavedLibrary | undefined;
  flight = (async () => {
    useCloudSync.setState({busy: true, error: ''});
    const key = `onda.cloud-base.${userId}`;
    const raw = await AsyncStorage.getItem(key);
    const base = raw ? JSON.parse(raw) as SavedLibrary : emptySaved;
    const local = snapshot();
    let merged: SavedLibrary | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      const remote = await accountRequest<LibraryEnvelope>('/api/v1/library/');
      merged = mergeSaved(base, local, remote.library);
      try {
        if (JSON.stringify(merged) !== JSON.stringify(remote.library))
          await accountRequest<LibraryEnvelope>('/api/v1/library/', {method: 'PUT', body: {version: remote.version, library: merged}});
        break;
      } catch (error) {if (!(error instanceof ApiError && error.status === 409) || attempt > 0) throw error;}
    }
    if (!merged || useAuth.getState().session?.user.id !== userId || useLibrary.getState().syncAccountId !== userId) return;
    // Replay edits made while the request was in flight, preserving the person's current work.
    const beforeLookup = snapshot();
    const applied = mergeSaved(local, beforeLookup, merged);
    committed = merged;
    await AsyncStorage.setItem(key, JSON.stringify(merged));
    if (JSON.stringify(applied) === JSON.stringify(beforeLookup)) {useCloudSync.setState({lastSync: Date.now()}); return;}
    const state = useLibrary.getState();
    const ids = [...new Set([...applied.favorites, ...(applied.history ?? []), ...applied.collections.flatMap(x => x.stations)])];
    const stations = new Map([...state.favorites, ...state.history, ...state.collections.flatMap(x => x.stations)].map(s => [s.id, s]));
    const refreshed = await lookupStations(ids); refreshed.forEach(s => stations.set(s.id, s));
    if (useAuth.getState().session?.user.id !== userId || useLibrary.getState().syncAccountId !== userId) return;
    const final = mergeSaved(beforeLookup, snapshot(), applied);
    const unavailable = (id: string): Station => ({id, name: 'Emisora fuera del catálogo', country: '', countryCode: '', language: '', tags: [], streamUrl: '', artworkUrl: null, codec: '', bitrate: 0, votes: 0, latitude: null, longitude: null});
    const rows = (values: string[]) => values.map(id => stations.get(id) ?? unavailable(id));
    useLibrary.setState({favorites: rows(final.favorites), collections: final.collections.map(x => ({id: x.id, name: x.name, stations: rows(x.stations)})),
      mediaFavorites: (final.media ?? []).map(x => ({id: x.id, media: {kind: x.kind, url: x.url, title: x.title, category: x.category ?? '', station: null, videoId: x.kind === 'youtube' ? new URL(x.url).searchParams.get('v') : null}})),
      ...(final.history !== null ? {history: rows(final.history)} : {})});
    useCloudSync.setState({lastSync: Date.now()});
  })().catch(error => {useCloudSync.setState({error: error instanceof Error ? error.message : 'No se pudo sincronizar. Tu biblioteca sigue guardada en este dispositivo.'});})
    .finally(() => {
      flight = null; useCloudSync.setState({busy: false});
      try {
        if (committed && useLibrary.getState().syncAccountId === userId && JSON.stringify(snapshot()) !== JSON.stringify(committed))
          setTimeout(() => void syncLibrary(), 1800);
      } catch (error) {useCloudSync.setState({error: error instanceof Error ? error.message : 'No se pudo sincronizar.'});}
    });
  return flight;
}
export function useLibraryCloudSync() {
  const accountId = useAuth(s => s.session?.user.id); const ready = useAuth(s => s.ready);
  const enabled = useLibrary(s => s.syncAccountId === accountId && !!accountId);
  useEffect(() => {
    if (!ready || !enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {clearTimeout(timer); timer = setTimeout(() => void syncLibrary(), 1800);};
    const unsubscribe = useLibrary.subscribe((current, previous) => {
      if (current.favorites !== previous.favorites || current.collections !== previous.collections || current.mediaFavorites !== previous.mediaFavorites || current.syncHistory !== previous.syncHistory || current.syncHistory && current.history !== previous.history) schedule();
    });
    const active = AppState.addEventListener('change', state => {if (state === 'active') void syncLibrary();});
    void syncLibrary();
    return () => {clearTimeout(timer); unsubscribe(); active.remove();};
  }, [accountId, ready, enabled]);
}
