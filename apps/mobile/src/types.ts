export type Availability = 'unknown' | 'ok' | 'unstable' | 'down';
export type Station = {
  id: string; name: string; country: string; countryCode: string; language: string;
  tags: string[]; streamUrl: string; artworkUrl: string | null; codec: string;
  bitrate: number; votes: number; latitude: number | null; longitude: number | null;
  /** Added by the catalog API v1.1; absent in libraries saved by older versions. */
  region?: string; streams?: string[]; homepage?: string | null; availability?: Availability; languageCodes?: string[];
};
export type PlaybackState = 'idle' | 'connecting' | 'buffering' | 'playing' | 'paused' | 'error';
export type StationPage = {
  items: Station[]; nextCursor: string | null; hasMore: boolean; source: 'catalog' | 'live';
  total: number | null; stale: boolean; limit: number;
};
export type MapCell = {latitude: number; longitude: number; count: number; stationId: string | null; name: string | null};
export type MapArea = {cells: MapCell[]; total: number; partial: boolean};
export type CountryFacet = {code: string; name: string; count: number; bounds: [number, number, number, number] | null};
export type PlaceFacet = {name: string; count: number; latitude: number | null; longitude: number | null};
export type LabeledFacet = {value: string; label: string; count: number};
export type CatalogStatus = {mode: 'catalog' | 'live'; stations: number; playable: number; lastCompletedSync: string | null; runningStatus: string | null; runningOffset: number | null; attribution: string};
