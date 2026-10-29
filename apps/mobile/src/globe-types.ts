import type {FeatureCollection, Point} from 'geojson';
import type {Bounds} from './geo';
export type GlobeCommand = {type: 'fit'; bounds: Bounds} | {type: 'focus'; center: [number, number]; zoom?: number} | {type: 'zoom'; delta: number} | {type: 'home'} | {type: 'mode'; value: 'earth' | 'streets'};
export type GlobeHandle = {send(command: GlobeCommand): void};
export type GlobeProps = {features: FeatureCollection<Point>; selectedId: string | null; onViewport(bounds: Bounds, zoom: number): void; onSelect(id: string): void; onGroup(): void; onReady(): void; onError(message: string): void};
/** The embedded renderer has a deliberately tiny bridge: no URLs, files, playback or account access. */
export function receiveGlobe(data: unknown, props: GlobeProps) {
  if (!data || typeof data !== 'object') return;
  const d = data as Record<string, unknown>;
  if (d.type === 'viewport' && Array.isArray(d.bounds) && d.bounds.length === 4 && d.bounds.every(n => typeof n === 'number' && Number.isFinite(n)) && typeof d.zoom === 'number' && Number.isFinite(d.zoom)) props.onViewport(d.bounds as Bounds, Math.min(20, Math.max(0, d.zoom)));
  else if (d.type === 'select' && typeof d.id === 'string' && props.features.features.some(f => f.properties?.stationId === d.id)) props.onSelect(d.id);
  else if (d.type === 'group') props.onGroup();
  else if (d.type === 'ready') props.onReady();
  else if (d.type === 'error') props.onError('No se pudieron cargar las imágenes del globo. Prueba la vista Mapa o la lista.');
}
