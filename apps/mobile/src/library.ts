import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Station } from './types';
export const prependUnique = (items: Station[], station: Station, limit = 100) =>
  [station, ...items.filter(s => s.id !== station.id)].slice(0, limit);
type Library = {
  favorites: Station[]; history: Station[]; searches: string[];
  country: string; theme: 'dark' | 'light' | 'system';
  toggle: (station: Station) => void; remember: (station: Station) => void;
  setCountry: (country: string) => void; setTheme: (theme: Library['theme']) => void;
  rememberSearch: (text: string) => void; clear: () => void;
};
export const useLibrary = create<Library>()(persist((set) => ({
  favorites: [], history: [], searches: [], country: 'PE', theme: 'dark',
  toggle: s => set(x => ({ favorites: x.favorites.some(f => f.id === s.id) ? x.favorites.filter(f => f.id !== s.id) : prependUnique(x.favorites, s, 500) })),
  remember: s => set(x => ({ history: prependUnique(x.history, s) })),
  setCountry: country => set({country}), setTheme: theme => set({theme}),
  rememberSearch: text => set(x => ({searches: [text, ...x.searches.filter(s => s !== text)].filter(Boolean).slice(0, 12)})),
  clear: () => set({favorites: [], history: [], searches: []}),
}), {name: 'onda-library-v1', storage: createJSONStorage(() => AsyncStorage)}));
