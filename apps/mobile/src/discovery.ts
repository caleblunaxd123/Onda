import type { Station } from './types';

export type ListeningProfile = {tags: string[]; countries: string[]; recent: string[]};

/**
 * Deterministic taste profile from what the person saved and actually listened to on this device.
 * Favorites weigh most, then collections, then history (recent plays weigh more). Nothing is inferred from audio.
 */
export function listeningProfile(favorites: Station[], history: Station[], collections: {stations: Station[]}[] = []): ListeningProfile {
  const tags = new Map<string, number>();
  const countries = new Map<string, number>();
  const add = (station: Station, weight: number) => {
    station.tags.slice(0, 3).forEach((tag, i) => tags.set(tag, (tags.get(tag) ?? 0) + weight / (1 + i * 0.5)));
    if (station.countryCode) countries.set(station.countryCode, (countries.get(station.countryCode) ?? 0) + weight);
  };
  favorites.forEach(s => add(s, 3));
  collections.forEach(c => c.stations.forEach(s => add(s, 2)));
  history.slice(0, 50).forEach((s, i) => add(s, 1 / (1 + i * 0.1)));
  const top = (map: Map<string, number>, n: number) => [...map].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([key]) => key);
  return {tags: top(tags, 5), countries: top(countries, 3), recent: history.slice(0, 30).map(s => s.id)};
}

/** Changes once per day so discovery rotates without reshuffling while the person scrolls. */
export const daySeed = (date = new Date()) => date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

/** Picks a stable item for the day from a list (e.g. the "genre of the day"). */
export const pickForDay = <T,>(items: T[], seed: number): T | undefined => items.length ? items[seed % items.length] : undefined;
