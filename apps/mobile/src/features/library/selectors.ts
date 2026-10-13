import {matchesText, tagLabel} from '../../format';
import type {Station} from '../../types';

export type LibrarySort = 'saved' | 'name' | 'country';
export const sortLabels: Record<LibrarySort, string> = {saved: 'Orden guardado', name: 'Nombre A–Z', country: 'País A–Z'};

export function libraryStations(stations: Station[], query: string, country: string, sort: LibrarySort): Station[] {
  const rows = stations.filter(s => (!country || s.countryCode === country)
    && matchesText([s.name, s.country, s.countryCode, s.region, s.language, ...s.tags.map(tagLabel)].filter(Boolean).join(' '), query));
  if (sort === 'name') rows.sort((a, b) => a.name.localeCompare(b.name, 'es', {sensitivity: 'base'}) || a.id.localeCompare(b.id));
  if (sort === 'country') rows.sort((a, b) => a.country.localeCompare(b.country, 'es', {sensitivity: 'base'}) || a.name.localeCompare(b.name, 'es', {sensitivity: 'base'}) || a.id.localeCompare(b.id));
  return rows;
}

export function libraryCountries(stations: Station[]) {
  const countries = new Map<string, {value: string; label: string; count: number}>();
  for (const station of stations) {
    if (!station.countryCode) continue;
    const existing = countries.get(station.countryCode);
    if (existing) existing.count++;
    else countries.set(station.countryCode, {value: station.countryCode, label: station.country || station.countryCode, count: 1});
  }
  return [...countries.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

export function collectionDescription(stations: Station[]) {
  const genres = new Map<string, number>();
  for (const station of stations) for (const tag of station.tags.slice(0, 2)) genres.set(tag, (genres.get(tag) ?? 0) + 1);
  return [...genres].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([tag]) => tagLabel(tag)).join(' · ') || 'Tu selección de radios';
}
