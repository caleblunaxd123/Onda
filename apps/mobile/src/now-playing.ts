import type {Station} from './types';
import type {PlayerEngine} from './player-engine';

export const stationArtwork = (station: Station) => station.artworkUrl ?? 'https://onda.lunalav.pe/brand/onda-radio.png';
export const lockScreenMetadata = (station: Station, title: string | null) => ({
  title: title || station.name,
  artist: title ? station.name : ['Radio en directo', station.country].filter(Boolean).join(' · '),
  albumTitle: 'ONDA · El mundo suena aquí', artworkUrl: stationArtwork(station),
});
export type MetadataReply = {stationId: string; source: number; status: 'available' | 'unavailable' | 'unsupported'; title: string | null; observedAt: string | null};
type Getter = (path: string, signal: AbortSignal) => Promise<MetadataReply>;

/** A single app-wide poller. Abort and clear on pause/change; never reuse a cached title from another source. */
export function watchNowPlaying(engine: PlayerEngine, get: Getter) {
  let key = ''; let generation = 0; let timer: ReturnType<typeof setTimeout> | undefined; let controller: AbortController | undefined;
  const sync = () => {
    const s = engine.getSnapshot();
    const next = s.state === 'playing' && s.station ? `${s.station.id}/${s.source}` : '';
    if (next === key) return;
    key = next; const token = ++generation;
    clearTimeout(timer); controller?.abort();
    if (!next || !s.station) return;
    const id = s.station.id; const source = s.source;
    const poll = async () => {
      controller = new AbortController(); let delay = 30000;
      try {
        const reply = await get(`/api/v1/stations/${id}/now-playing?source=${source}`, controller.signal);
        if (token !== generation) return;
        if (reply.stationId !== id || reply.source !== source) throw new Error('Mismatched metadata identity');
        const observed = reply.observedAt ? Date.parse(reply.observedAt) : NaN;
        const fresh = Number.isFinite(observed) && Math.abs(Date.now() - observed) <= 90000;
        engine.setMetadata(id, source, fresh ? reply.title : null, reply.status);
        if (reply.status === 'unsupported') delay = 120000;
      } catch {if (token === generation) engine.setMetadata(id, source, null, 'unavailable');}
      if (token === generation) timer = setTimeout(() => {void poll();}, delay);
    };
    void poll();
  };
  const unsubscribe = engine.subscribe(sync); sync();
  return () => {++generation; key = ''; unsubscribe(); clearTimeout(timer); controller?.abort();};
}
