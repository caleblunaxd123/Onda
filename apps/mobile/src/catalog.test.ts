import { describe, expect, it, vi } from 'vitest';
import { EMPTY_PAGE_FOLLOWS, MAX_LIST_ITEMS, fetchStationPage, mergeStationPages, nextCursorFor } from './catalog';
import { daySeed, listeningProfile } from './discovery';
import { cellsToFeatures, viewportKey } from './geo';
import type { Station, StationPage } from './types';
vi.mock('react-native', () => ({Platform: {OS: 'android'}}));

const station = (id: string, extra: Partial<Station> = {}): Station => ({id, name: id, country: 'Perú', countryCode: 'PE', language: '', tags: [], streamUrl: 'https://x/' + id, artworkUrl: null, codec: '', bitrate: 0, votes: 0, latitude: null, longitude: null, ...extra});
const page = (ids: string[], nextCursor: string | null, extra: Partial<StationPage> = {}): StationPage => ({items: ids.map(id => station(id)), nextCursor, hasMore: !!nextCursor, source: 'live', total: null, stale: false, limit: 30, ...extra});

describe('progressive catalog pages', () => {
  it('follows filtered empty pages instead of treating them as the end', async () => {
    const responses: Record<string, StationPage> = {'': page([], 'c1'), c1: page([], 'c2'), c2: page(['a', 'b'], 'c3')};
    const urls: string[] = [];
    const result = await fetchStationPage({q: 'jazz'}, null, 30, undefined, async url => {urls.push(url); return responses[new URLSearchParams(url.split('?')[1]).get('cursor') ?? ''];});
    expect(result.items.map(s => s.id)).toEqual(['a', 'b']);
    expect(result.nextCursor).toBe('c3');
    expect(urls).toHaveLength(3);
  });
  it('stops following empty pages after a bounded number of requests', async () => {
    let calls = 0;
    const result = await fetchStationPage({}, null, 30, undefined, async () => {calls++; return page([], 'next-' + calls);});
    expect(calls).toBe(EMPTY_PAGE_FOLLOWS + 1);
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(true);
  });
  it('keeps the total from the first page only', async () => {
    const responses: Record<string, StationPage> = {'': page([], 'c1', {total: 42}), c1: page(['a'], null)};
    const result = await fetchStationPage({}, null, 30, undefined, async url => responses[new URLSearchParams(url.split('?')[1]).get('cursor') ?? '']);
    expect(result.total).toBe(42);
  });
  it('accumulates pages without duplicates and in server order', () => {
    expect(mergeStationPages([page(['a', 'b'], 'x'), page(['b', 'c', 'a', 'd'], null)]).map(s => s.id)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('stops asking for pages at the in-memory limit', () => {
    const big = page(Array.from({length: MAX_LIST_ITEMS}, (_, i) => 's' + i), 'more');
    expect(nextCursorFor([big])).toBeUndefined();
    expect(nextCursorFor([page(['a'], 'more')])).toBe('more');
    expect(nextCursorFor([page(['a'], null)])).toBeUndefined();
  });
});

describe('discovery profile', () => {
  it('weighs favorites over history and excludes recent plays', () => {
    const profile = listeningProfile([station('f', {tags: ['jazz'], countryCode: 'JP'})], [station('h1', {tags: ['rock'], countryCode: 'PE'}), station('h2', {tags: ['rock']})]);
    expect(profile.tags[0]).toBe('jazz');
    expect(profile.countries[0]).toBe('JP');
    expect(profile.recent).toEqual(['h1', 'h2']);
  });
  it('rotates once per day', () => {
    expect(daySeed(new Date(2026, 9, 12, 23, 59))).toBe(daySeed(new Date(2026, 9, 12, 0, 1)));
    expect(daySeed(new Date(2026, 9, 13))).not.toBe(daySeed(new Date(2026, 9, 12)));
  });
});

describe('map viewport', () => {
  it('rounds and wraps viewports so camera jitter reuses queries', () => {
    expect(viewportKey([-80.123456, -20.4, -60.98, 0.2], 4.1)).toEqual(viewportKey([-80.1234, -20.4001, -60.9801, 0.2001], 4.2));
    expect(viewportKey([-200, -100, 200, 100], 0.3).bbox).toBe('-180,-90,180,90');
    expect(viewportKey([170, -30, 190, 10], 3).bbox).toBe('170,-30,-170,10');
  });
  it('converts server cells into clusters with exact counts and selectable points', () => {
    const features = cellsToFeatures({total: 1503, partial: false, cells: [
      {latitude: -12, longitude: -77, count: 1500, stationId: null, name: null},
      {latitude: -16, longitude: -71, count: 1, stationId: 'abc', name: 'Radio'},
    ]}).features;
    expect(features[0].properties).toMatchObject({count: 1500, label: '1.5k', stationId: ''});
    expect(features[1].properties).toMatchObject({count: 1, stationId: 'abc'});
    expect(features[1].geometry.coordinates).toEqual([-71, -16]);
  });
});
