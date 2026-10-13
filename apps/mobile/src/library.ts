import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Station } from './types';
export const prependUnique = (items: Station[], station: Station, limit = 100) =>
  [station, ...items.filter(s => s.id !== station.id)].slice(0, limit);

export type Collection = { id: string; name: string; stations: Station[] };
export const collectionName = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, 50);
type Library = {
  favorites: Station[]; history: Station[]; searches: string[]; collections: Collection[];
  country: string; theme: 'dark' | 'light' | 'system';
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
  favorites: [], history: [], searches: [], collections: [], country: 'PE', theme: 'system',
  toggle: s => set(x => ({ favorites: x.favorites.some(f => f.id === s.id) ? x.favorites.filter(f => f.id !== s.id) : prependUnique(x.favorites, s, 500) })),
  remember: s => set(x => ({ history: prependUnique(x.history, s) })),
  setCountry: country => set({country}), setTheme: theme => set({theme}),
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
}), {name: 'onda-library-v1', storage: createJSONStorage(() => AsyncStorage)}));
