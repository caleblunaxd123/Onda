import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { query, request } from './api';
import type { CatalogStatus, CountryFacet, LabeledFacet, MapArea, PlaceFacet, Station, StationPage } from './types';

export type StationFilters = {
  q?: string; country?: string; tag?: string; language?: string; region?: string;
  /** west,south,east,north */
  bbox?: string; geo?: 'present' | 'missing'; order?: 'popular' | 'discover'; seed?: number;
  boostTags?: string[]; boostCountries?: string[]; exclude?: string[];
};

/** Upper bound of stations kept in memory for one list; the catalog is never loaded whole on the phone. */
export const MAX_LIST_ITEMS = 600;
/** Empty filtered pages followed automatically before handing control back to the user. */
export const EMPTY_PAGE_FOLLOWS = 3;

const params = (filters: StationFilters) => ({
  ...filters,
  boostTags: filters.boostTags?.join(','), boostCountries: filters.boostCountries?.join(','), exclude: filters.exclude?.join(','),
});

type Getter = (path: string, signal?: AbortSignal) => Promise<StationPage>;
const get: Getter = (path, signal) => request<StationPage>(path, {signal});

/**
 * Loads one page. A filtered page can be empty while the catalog continues (`hasMore`), so empty pages are
 * followed through their cursor a bounded number of times instead of being read as the end of the list.
 */
export async function fetchStationPage(filters: StationFilters, cursor: string | null, limit: number, signal?: AbortSignal, getter: Getter = get): Promise<StationPage> {
  let current = cursor;
  let page: StationPage | undefined;
  for (let attempt = 0; attempt <= EMPTY_PAGE_FOLLOWS; attempt++) {
    const next: StationPage = await getter('/api/v1/stations?' + query({...params(filters), cursor: current, limit}), signal);
    page = page ? {...next, total: page.total ?? next.total} : next;
    if (next.items.length > 0 || !next.hasMore || !next.nextCursor) return page;
    current = next.nextCursor;
  }
  return page!;
}

/** Accumulates pages keeping the first occurrence of each station and the server order. */
export function mergeStationPages(pages: Pick<StationPage, 'items'>[]): Station[] {
  const seen = new Set<string>();
  const merged: Station[] = [];
  for (const page of pages) for (const station of page.items) {
    if (seen.has(station.id)) continue;
    seen.add(station.id);
    merged.push(station);
  }
  return merged;
}

export function nextCursorFor(pages: StationPage[]): string | undefined {
  const last = pages.at(-1);
  if (!last?.hasMore || !last.nextCursor) return undefined;
  return mergeStationPages(pages).length >= MAX_LIST_ITEMS ? undefined : last.nextCursor;
}

export function useStationFeed(filters: StationFilters, {limit = 30, enabled = true, keepPrevious = false}: {limit?: number; enabled?: boolean; keepPrevious?: boolean} = {}) {
  const result = useInfiniteQuery({
    queryKey: ['stations', filters, limit],
    queryFn: ({pageParam, signal}) => fetchStationPage(filters, pageParam, limit, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (_last, pages) => nextCursorFor(pages),
    staleTime: 5 * 60_000, retry: 1, enabled,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  });
  const pages = result.data?.pages;
  const items = useMemo(() => mergeStationPages(pages ?? []), [pages]);
  const last = pages?.at(-1);
  return {
    ...result, items,
    total: pages?.[0]?.total ?? null,
    stale: pages?.some(p => p.stale) ?? false,
    /** More results exist but the in-memory limit was reached: ask the user to refine. */
    capped: !!last?.hasMore && items.length >= MAX_LIST_ITEMS,
    loadMore: () => {if (result.hasNextPage && !result.isFetchingNextPage) void result.fetchNextPage();},
  };
}

const facet = <T,>(key: string[], path: string, enabled = true) => ({
  queryKey: ['facet', ...key], enabled, staleTime: 30 * 60_000, retry: 1,
  queryFn: async ({signal}: {signal: AbortSignal}) => (await request<{items: T[]}>(path, {signal})).items,
});
export const useCountries = () => useQuery(facet<CountryFacet>(['countries'], '/api/v1/facets/countries'));
export const useLanguages = () => useQuery(facet<LabeledFacet>(['languages'], '/api/v1/facets/languages'));
export const useTags = () => useQuery(facet<LabeledFacet>(['tags'], '/api/v1/facets/tags'));
export const usePlaces = (country?: string) => useQuery(facet<PlaceFacet>(['places', country ?? ''], '/api/v1/facets/places?' + query({country}), !!country));

export function useMapArea(viewport: {bbox: string; zoom: number} | null, filters: Pick<StationFilters, 'country' | 'tag' | 'language' | 'region'>) {
  return useQuery({
    queryKey: ['map', viewport, filters], enabled: !!viewport, staleTime: 5 * 60_000, retry: 1,
    placeholderData: keepPreviousData,
    queryFn: ({signal}) => request<MapArea>('/api/v1/map?' + query({...filters, bbox: viewport!.bbox, zoom: Math.min(20, viewport!.zoom + 1.5).toFixed(2)}), {signal}),
  });
}

export const useCatalogStatus = () => useQuery({
  queryKey: ['catalog-status'], staleTime: 60_000, retry: 1,
  queryFn: ({signal}) => request<CatalogStatus>('/api/v1/catalog/status', {signal}),
});

export async function lookupStations(ids: string[], signal?: AbortSignal): Promise<Station[]> {
  const found: Station[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    found.push(...(await request<{items: Station[]}>('/api/v1/stations/lookup?' + query({ids: ids.slice(i, i + 100).join(',')}), {signal})).items);
  }
  return found;
}

export type ReportKind = 'no_audio' | 'cuts' | 'wrong_info' | 'other';
export const sendReport = (station: Station, kind: ReportKind, message: string, streamUrl: string | null, appVersion: string, platform: string) =>
  request<{id: number; status: string}>(`/api/v1/stations/${station.id}/reports`, {
    method: 'POST', timeoutMs: 12000,
    body: {kind, message: message.trim() || undefined, streamUrl: streamUrl?.startsWith('https://') ? streamUrl : undefined, appVersion, platform},
  });
