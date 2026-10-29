import {expect, it} from 'vitest';
import {mergeBackup, parseBackup, serializeBackup, MAX_BACKUP_BYTES} from './library-backup';
import type {Station} from './types';
const station: Station = {id: 'a', name: 'Radio Perú', country: 'Perú', countryCode: 'PE', language: 'es', tags: ['pop'], streamUrl: 'https://radio.example/stream', artworkUrl: null, codec: 'MP3', bitrate: 128, votes: 3, latitude: -12, longitude: -77};
const other = {...station, id: 'b', name: 'Jazz', streamUrl: 'https://other.example/stream'};
const backup = (patch = {}) => JSON.stringify({format: 'onda-library', version: 1, exportedAt: '2026-10-29', favorites: [station], collections: [{id: 'a', name: 'Viajes', stations: [station]}], ...patch});
it('round-trips Unicode favorites and collections without exporting history, settings or accounts', () => {
  const raw = serializeBackup({favorites: [station], collections: [{id: 'x', name: 'Mañanas ☀️', stations: [station]}], ...{history: [other], secret: 'never-export'}});
  expect(raw).not.toContain('never-export'); expect(raw).not.toContain('history');
  expect(parseBackup(raw).collections[0].name).toBe('Mañanas ☀️');
  expect(parseBackup(raw).favorites[0].name).toBe(station.name);
});
it('merges into existing lists without deleting, reordering or replacing their snapshots', () => {
  const current = {favorites: [other], collections: [{id: 'local', name: 'viajes', stations: [other]}]};
  const merged = mergeBackup(current, parseBackup(backup()));
  expect(merged.favorites.map(s => s.id)).toEqual(['b', 'a']);
  expect(merged.collections).toHaveLength(1); expect(merged.collections[0].id).toBe('local');
  expect(merged.collections[0].stations.map(s => s.id)).toEqual(['b', 'a']);
  expect(current.collections[0].stations).toEqual([other]);
  expect(mergeBackup(merged, parseBackup(backup())).addedFavorites).toBe(0);
  expect(mergeBackup(merged, parseBackup(backup())).addedStations).toBe(0);
});
it('deduplicates broadcasts with different IDs and generates new collection IDs', () => {
  const incoming = parseBackup(backup({favorites: [station, {...station, id: 'alias'}]}));
  expect(incoming.favorites).toHaveLength(1);
  expect(mergeBackup({favorites: [], collections: []}, incoming, () => 'safe-local-id').collections[0].id).toBe('safe-local-id');
});
it.each(['', '{}', 'not json', backup({version: 2}), backup({format: 'other'}), backup({favorites: [null]}), backup({favorites: [{...station, streamUrl: 'file:///secret'}]}), backup({favorites: [{...station, streamUrl: 'https://user:password@example.com'}]})])('rejects invalid and incompatible backups', raw => expect(() => parseBackup(raw)).toThrow());
it('whitelists imported fields and removes unsafe artwork and homepage links', () => {
  const restored = parseBackup(backup({favorites: [{...station, __proto__: {evil: true}, onClick: 'run', artworkUrl: 'javascript:alert(1)', homepage: 'http://plain.example', streams: ['https://ok.example/live', 'file:///secret']}]}));
  expect(restored.favorites[0]).not.toHaveProperty('onClick');
  expect(restored.favorites[0].artworkUrl).toBeNull(); expect(restored.favorites[0].homepage).toBeNull();
  expect(restored.favorites[0].streams).toEqual(['https://ok.example/live']);
});
it('rejects oversized files, oversized lists and duplicate collection names', () => {
  expect(() => parseBackup(' '.repeat(MAX_BACKUP_BYTES + 1))).toThrow('5 MB');
  expect(() => parseBackup(backup({favorites: Array(501).fill(station)}))).toThrow();
  expect(() => parseBackup(backup({collections: [{name: 'Viajes', stations: []}, {name: 'viajes', stations: []}]}))).toThrow('duplicadas');
});
it('refuses overflowing merges atomically rather than silently dropping favorites', () => {
  const full = Array.from({length: 500}, (_, i) => ({...station, id: String(i), name: String(i), streamUrl: `https://example.com/${i}`}));
  const current = {favorites: full, collections: []};
  expect(() => mergeBackup(current, {favorites: [other], collections: []})).toThrow('no cambió');
  expect(current.favorites).toHaveLength(500);
});
