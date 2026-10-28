import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Station } from './types';
const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const streamKey = (url: string) => url.replace(/^https?:\/\//i, '').replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();

/**
 * Same broadcast even when the catalog lists it twice: same id, same stream URL, or same name in the same country.
 * Radio Browser contains such duplicates under different ids.
 */
export const sameBroadcast = (a: Station, b: Station) =>
  a.id === b.id || streamKey(a.streamUrl) === streamKey(b.streamUrl) ||
  (fold(a.name) === fold(b.name) && a.countryCode === b.countryCode);

/** Keeps the first occurrence of each broadcast, preserving order. */
export const uniqueBroadcasts = (items: Station[]) =>
  items.filter((station, index) => items.findIndex(other => sameBroadcast(other, station)) === index);

export const prependUnique = (items: Station[], station: Station, limit = 100) =>
  [station, ...items.filter(s => !sameBroadcast(s, station))].slice(0, limit);

export type Collection = { id: string; name: string; stations: Station[] };

/**
 * Replaces saved snapshots with fresher catalog data, matched by stable id. Never removes, reorders or adds
 * stations: favorites, history and collections survive catalog updates and stations missing from the catalog.
 */
export function refreshSnapshots<T extends {stations: Station[]}>(lists: {favorites: Station[]; history: Station[]; collections: T[]}, updated: Station[]) {
  const byId = new Map(updated.map(s => [s.id, s]));
  const swap = (items: Station[]) => items.map(s => byId.get(s.id) ?? s);
  return {favorites: swap(lists.favorites), history: swap(lists.history), collections: lists.collections.map(c => ({...c, stations: swap(c.stations)}))};
}
export const libraryIds = (lists: {favorites: Station[]; history: Station[]; collections: {stations: Station[]}[]}) =>
  [...new Set([...lists.favorites, ...lists.history, ...lists.collections.flatMap(c => c.stations)].map(s => s.id))];
export const collectionName = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, 50);
type Library = {
  favorites: Station[]; history: Station[]; searches: string[]; collections: Collection[];
  country: string; theme: 'dark' | 'light' | 'system';
  /** auto: follows the country detected from the device time zone; manual: chosen in Settings. */
  countryMode: 'auto' | 'manual';
  syncDeviceCountry: (code: string) => void; followDeviceCountry: (code: string) => void;
  /** First-run choices; genres the person said they like (used for discovery). */
  onboarded: boolean; likedTags: string[]; refreshedAt: number;
  finishOnboarding: (country: string, tags: string[], mode?: 'auto' | 'manual') => void; setLikedTags: (tags: string[]) => void;
  refreshStations: (updated: Station[]) => void;
  toggle: (station: Station) => void; remember: (station: Station) => void;
  setCountry: (country: string) => void; setTheme: (theme: Library['theme']) => void;
  rememberSearch: (text: string) => void; clear: () => void;
  createCollection: (name: string) => string | null;
  renameCollection: (id: string, name: string) => boolean;
  deleteCollection: (id: string) => void;
  addToCollection: (id: string, station: Station) => void;
  removeFromCollection: (id: string, stationId: string) => void;
};
export const useLibrary = create<Library>()(persist((set) => ({
  favorites: [], history: [], searches: [], collections: [], country: 'PE', theme: 'system', countryMode: 'auto',
  syncDeviceCountry: code => set(x => x.countryMode === 'auto' && x.country !== code ? {country: code} : {}),
  followDeviceCountry: code => set({countryMode: 'auto', country: code}),
  onboarded: false, likedTags: [], refreshedAt: 0,
  finishOnboarding: (country, tags, mode = 'manual') => set({country, countryMode: mode, likedTags: tags.slice(0, 8), onboarded: true}),
  setLikedTags: tags => set({likedTags: tags.slice(0, 8)}),
  refreshStations: updated => set(x => ({...refreshSnapshots(x, updated), refreshedAt: Date.now()})),
  toggle: s => set(x => ({ favorites: x.favorites.some(f => f.id === s.id) ? x.favorites.filter(f => f.id !== s.id) : prependUnique(x.favorites, s, 500) })),
  remember: s => set(x => ({ history: prependUnique(x.history, s) })),
  setCountry: country => set({country, countryMode: 'manual'}), setTheme: theme => set({theme}),
  rememberSearch: text => set(x => ({searches: [text, ...x.searches.filter(s => s !== text)].filter(Boolean).slice(0, 12)})),
  createCollection: input => {
    const name = collectionName(input);
    if (!name) return null;
    const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    set(x => ({collections: [...x.collections, {id, name, stations: []}]}));
    return id;
  },
  renameCollection: (id, input) => {
    const name = collectionName(input);
    if (!name) return false;
    set(x => ({collections: x.collections.map(c => c.id === id ? {...c, name} : c)}));
    return true;
  },
  deleteCollection: id => set(x => ({collections: x.collections.filter(c => c.id !== id)})),
  addToCollection: (id, station) => set(x => ({collections: x.collections.map(c => c.id === id
    ? {...c, stations: c.stations.some(s => s.id === station.id)
      ? c.stations.map(s => s.id === station.id ? station : s) : [...c.stations, station]} : c)})),
  removeFromCollection: (id, stationId) => set(x => ({collections: x.collections.map(c => c.id === id
    ? {...c, stations: c.stations.filter(s => s.id !== stationId)} : c)})),
  clear: () => set({favorites: [], history: [], searches: [], collections: []}),
}), {
  name: 'onda-library-v1', storage: createJSONStorage(() => AsyncStorage),
  // Libraries saved before onboarding existed already chose a country: do not show onboarding again.
  merge: (persisted, current) => {
    const saved = (persisted ?? {}) as Partial<Library>;
    const existing = !!saved.favorites?.length || !!saved.history?.length || !!saved.collections?.length;
    // The previous social beta also offered "soft". Keep its light appearance without an invalid setting.
    const theme = saved.theme === 'dark' || saved.theme === 'light' || saved.theme === 'system' ? saved.theme : 'light';
    return {...current, ...saved, theme: saved.theme ? theme : current.theme, onboarded: saved.onboarded ?? existing};
  },
}));

/** True once the persisted library has been loaded from device storage. */
export function useLibraryHydrated() {
  const [hydrated, setHydrated] = useState(useLibrary.persist.hasHydrated());
  useEffect(() => useLibrary.persist.onFinishHydration(() => setHydrated(true)), []);
  return hydrated;
}

/** Ids played recently, captured once when a screen opens so playing a station does not reshuffle its lists. */
export const recentIdsSnapshot = (limit = 30) => useLibrary.getState().history.slice(0, limit).map(s => s.id);
