import type { FeatureCollection, Point } from 'geojson';
import type { MapArea } from './types';

export type Bounds = [west: number, south: number, east: number, north: number];
export type Viewport = {bbox: string; zoom: number};

/** Rounds the viewport so tiny camera jitter reuses cached queries. */
export function viewportKey(bounds: Bounds, zoom: number): Viewport {
  const digits = zoom < 4 ? 1 : zoom < 8 ? 2 : 3;
  const round = (n: number) => Number(n.toFixed(digits));
  const [west, south, east, north] = bounds;
  const wrap = (lon: number) => ((lon + 180) % 360 + 360) % 360 - 180;
  // A viewport showing the whole width of the world must not wrap 180 into -180.
  const [w, e] = east - west >= 360 ? [-180, 180] : [wrap(west), wrap(east) === -180 && east > west ? 180 : wrap(east)];
  return {bbox: [w, Math.max(-90, south), e, Math.min(90, north)].map(round).join(','), zoom: Math.round(zoom * 2) / 2};
}

/** Server cells as GeoJSON: clusters carry their exact count, single points carry the station id. */
export function cellsToFeatures(area: MapArea | undefined): FeatureCollection<Point> {
  return {type: 'FeatureCollection', features: (area?.cells ?? []).map((cell, i) => ({
    type: 'Feature', id: cell.stationId ?? `cell-${i}`,
    properties: {count: cell.count, label: cell.count > 999 ? `${Math.round(cell.count / 100) / 10}k` : String(cell.count), stationId: cell.stationId ?? '', name: cell.name ?? ''},
    geometry: {type: 'Point', coordinates: [cell.longitude, cell.latitude]},
  }))};
}

export const clusterColor = ['step', ['get', 'count'], '#1FBFD8', 10, '#2F74E6', 60, '#6D3BEF', 300, '#B13CD6'] as const;
export const clusterRadius = ['step', ['get', 'count'], 13, 10, 16, 60, 20, 300, 25] as const;

