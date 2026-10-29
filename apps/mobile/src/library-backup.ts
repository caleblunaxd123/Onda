import type {Station} from './types';
import type {Collection} from './library';
import {sameBroadcast, uniqueBroadcasts} from './broadcast';

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const BACKUP_LIMITS = {favorites: 500, collections: 100, stations: 500} as const;
const utf8Size = (text: string) => {let size = 0; for (const ch of text) {const n = ch.codePointAt(0)!; size += n < 128 ? 1 : n < 2048 ? 2 : n < 65536 ? 3 : 4;} return size;};
type Lists = {favorites: Station[]; collections: Collection[]};
export type LibraryBackup = Lists & {format: 'onda-library'; version: 1; exportedAt: string};
const fail = (message = 'El archivo no es un respaldo válido de ONDA.'): never => {throw new Error(message);};
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fail();
const text = (value: unknown, max: number, fallback = '') => typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, '').trim().slice(0, max) : fallback;
const url = (value: unknown) => {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null;} catch {return null;}
};
const list = (value: unknown, max: number): unknown[] => Array.isArray(value) && value.length <= max ? value : fail('El respaldo supera los límites de la biblioteca.');
function station(value: unknown): Station {
  const s = object(value); const id = text(s.id, 100); const name = text(s.name, 200); const streamUrl = url(s.streamUrl);
  if (!id || !name || !streamUrl) return fail('Una emisora del respaldo está incompleta o no usa HTTPS.');
  const strings = (v: unknown, max: number) => (Array.isArray(v) ? v.slice(0, max) : []).map(x => text(x, 80)).filter(Boolean);
  const coordinate = (v: unknown, max: number) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max ? v : null;
  return {id, name, country: text(s.country, 100), countryCode: /^[A-Z]{2}$/.test(String(s.countryCode)) ? String(s.countryCode) : '', language: text(s.language, 100),
    tags: strings(s.tags, 30), streamUrl, artworkUrl: url(s.artworkUrl), codec: text(s.codec, 30), bitrate: typeof s.bitrate === 'number' && s.bitrate >= 0 && s.bitrate < 100000 ? s.bitrate : 0,
    votes: 0, latitude: coordinate(s.latitude, 90), longitude: coordinate(s.longitude, 180), region: text(s.region, 100), homepage: url(s.homepage),
    streams: (Array.isArray(s.streams) ? s.streams.slice(0, 5) : []).map(url).filter((x): x is string => !!x), languageCodes: strings(s.languageCodes, 10), availability: 'unknown'};
}
/** Whitelist every field; never import settings, executable data, accounts or history. */
export function parseBackup(raw: string): LibraryBackup {
  if (raw.length > MAX_BACKUP_BYTES || utf8Size(raw) > MAX_BACKUP_BYTES) return fail('El archivo supera 5 MB.');
  let input: Record<string, unknown>;
  try {input = object(JSON.parse(raw));} catch {return fail();}
  if (input.format !== 'onda-library') return fail();
  if (input.version !== 1) return fail('Esta versión de respaldo no es compatible. Actualiza ONDA.');
  const favorites = uniqueBroadcasts(list(input.favorites, BACKUP_LIMITS.favorites).map(station));
  const names = new Set<string>();
  const collections = list(input.collections, BACKUP_LIMITS.collections).map((value, index) => {
    const c = object(value); const name = text(c.name, 50).replace(/\s+/g, ' ');
    if (!name) return fail('Hay una colección sin nombre.');
    const key = name.toLocaleLowerCase();
    if (names.has(key)) return fail('Hay colecciones duplicadas en el respaldo.');
    names.add(key);
    // File-provided IDs never overwrite local collections or collide with other data.
    return {id: `import-${index}`, name, stations: uniqueBroadcasts(list(c.stations, BACKUP_LIMITS.stations).map(station))};
  });
  return {format: 'onda-library', version: 1, exportedAt: text(input.exportedAt, 40), favorites, collections};
}

/** Keep the existing order and snapshots. Re-importing the same file is idempotent. */
export function mergeBackup(current: Lists, incoming: Lists, newId = () => `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`) {
  const favorites = uniqueBroadcasts([...current.favorites, ...incoming.favorites]);
  const collections = current.collections.map(c => ({...c, stations: [...c.stations]}));
  for (const item of incoming.collections) {
    const existing = collections.find(c => c.name.toLocaleLowerCase() === item.name.toLocaleLowerCase());
    if (existing) existing.stations = uniqueBroadcasts([...existing.stations, ...item.stations]);
    else collections.push({...item, id: newId(), stations: [...item.stations]});
  }
  if (favorites.length > BACKUP_LIMITS.favorites || collections.length > BACKUP_LIMITS.collections || collections.some(c => c.stations.length > BACKUP_LIMITS.stations))
    return fail('No hay espacio para combinar este respaldo (500 favoritas, 100 colecciones y 500 radios por colección). Tu biblioteca no cambió.');
  return {favorites, collections, addedFavorites: favorites.filter(s => !current.favorites.some(c => sameBroadcast(s, c))).length,
    addedCollections: collections.length - current.collections.length,
    addedStations: collections.reduce((n, c) => n + c.stations.length, 0) - current.collections.reduce((n, c) => n + c.stations.length, 0)};
}
export function serializeBackup(lists: Lists, now = new Date()) {
  const raw = JSON.stringify({format: 'onda-library', version: 1, exportedAt: now.toISOString(), favorites: lists.favorites, collections: lists.collections});
  // Enforce the same contract on export and import so every downloaded backup is restorable.
  const pretty = JSON.stringify(parseBackup(raw), null, 2);
  return utf8Size(pretty) <= MAX_BACKUP_BYTES ? pretty : raw;
}
