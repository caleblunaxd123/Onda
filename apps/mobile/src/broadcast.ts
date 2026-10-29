import type {Station} from './types';
const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const streamKey = (url: string) => url.replace(/^https?:\/\//i, '').replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
export const sameBroadcast = (a: Station, b: Station) => a.id === b.id || streamKey(a.streamUrl) === streamKey(b.streamUrl) || (fold(a.name) === fold(b.name) && a.countryCode === b.countryCode);
export const uniqueBroadcasts = (items: Station[]) => items.filter((station, index) => items.findIndex(other => sameBroadcast(other, station)) === index);
export const prependUnique = (items: Station[], station: Station, limit = 100) => [station, ...items.filter(s => !sameBroadcast(s, station))].slice(0, limit);
