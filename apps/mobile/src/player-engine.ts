import type { PlaybackState, Station } from './types';
export type NativeStatus = {playing: boolean; loaded: boolean; buffering: boolean; error?: boolean; finished?: boolean};
export type Handle = {play(): void; pause(): void; dispose(): void; setVolume?(value: number): void};
export type Snapshot = {
  station: Station | null; state: PlaybackState; error: string | null; sleepAt: number | null; volume: number;
  /** Stream currently tried and its position among the station's HTTPS sources. */
  streamUrl: string | null; source: number; sources: number; attempt: number;
};
export type Factory = (station: Station, streamUrl: string, onStatus: (status: NativeStatus) => void) => Handle;

/** Attempts per source before moving to the next one (a station with one source gets more), and the total cap. */
export const RETRIES_PER_SOURCE = 2;
export const RETRIES_SINGLE_SOURCE = 4;
export const MAX_TOTAL_ATTEMPTS = 6;
export const CONNECT_TIMEOUT_MS = 15000;

/** HTTPS sources for a station: its main stream first, then verified alternatives from the catalog, without duplicates. */
export const streamSources = (station: Station) =>
  [station.streamUrl, ...(station.streams ?? [])].filter((url, i, all) => /^https:\/\//i.test(url) && all.indexOf(url) === i).slice(0, 5);

const idle = {streamUrl: null, source: 0, sources: 0, attempt: 0};

/**
 * Single global player. Every selection disposes the previous native handle before creating a new one, and a
 * generation counter discards late events from released handles, so only one stream can be active.
 */
export class PlayerEngine {
  snapshot: Snapshot = {station: null, state: 'idle', error: null, sleepAt: null, volume: 1, ...idle};
  private listeners = new Set<() => void>();
  private handle?: Handle;
  private generation = 0;
  private sourceList: string[] = [];
  private sourceIndex = 0;
  private sourceAttempts = 0;
  private totalAttempts = 0;
  private wanted = false;
  private online = true;
  private retry?: ReturnType<typeof setTimeout>;
  private watchdog?: ReturnType<typeof setTimeout>;
  private sleep?: ReturnType<typeof setTimeout>;
  constructor(private factory: Factory, private now: () => number = Date.now) {}
  subscribe = (listener: () => void) => {this.listeners.add(listener); return () => {this.listeners.delete(listener);};};
  getSnapshot = () => this.snapshot;
  private update(patch: Partial<Snapshot>) {this.snapshot = {...this.snapshot, ...patch}; this.listeners.forEach(f => f());}
  private release() {
    this.generation++; clearTimeout(this.retry); clearTimeout(this.watchdog); this.watchdog = undefined;
    this.handle?.dispose(); this.handle = undefined;
  }
  select = (station: Station) => {
    this.release(); this.wanted = true;
    this.sourceList = streamSources(station); this.sourceIndex = 0; this.sourceAttempts = 0; this.totalAttempts = 0;
    this.update({station, error: null, sources: this.sourceList.length, source: 0, attempt: 0, streamUrl: this.sourceList[0] ?? null});
    if (this.sourceList.length === 0) {this.wanted = false; this.update({state: 'error', error: 'Esta emisora no ofrece una transmisión HTTPS compatible.'}); return;}
    this.connect();
  };
  /** Manual retry after an error: starts again from the first source. */
  retryNow = () => {if (this.snapshot.station) this.select(this.snapshot.station);};
  private armWatchdog() {
    if (!this.watchdog) this.watchdog = setTimeout(() => {this.watchdog = undefined; this.fail();}, CONNECT_TIMEOUT_MS);
  }
  private connect() {
    const station = this.snapshot.station;
    if (!station || !this.wanted) return;
    if (!this.online) {this.update({state: 'error', error: 'Sin conexión. Se retomará cuando vuelva internet.'}); return;}
    const streamUrl = this.sourceList[this.sourceIndex];
    this.totalAttempts++;
    this.update({state: 'connecting', streamUrl, source: this.sourceIndex + 1, attempt: this.sourceAttempts + 1});
    const generation = this.generation;
    try {
      this.handle = this.factory(station, streamUrl, status => {
        if (generation !== this.generation) return;
        this.checkSleep();
        if (generation !== this.generation) return;
        if (status.error || status.finished) {this.fail(); return;}
        if (status.playing && !status.buffering) {
          this.wanted = true;
          clearTimeout(this.watchdog); this.watchdog = undefined;
          this.sourceAttempts = 0;
          if (this.snapshot.state !== 'playing' || this.snapshot.error) this.update({state: 'playing', error: null});
        } else if (status.buffering || !status.loaded) {
          const state = status.loaded ? 'buffering' : 'connecting';
          if (this.snapshot.state !== state && this.snapshot.state !== 'paused') this.update({state});
          this.armWatchdog();
        } else if (this.snapshot.state === 'playing' || this.snapshot.state === 'paused') {
          // Paused natively: lock screen control, audio focus loss (call) or headphones unplugged.
          this.wanted = false;
          clearTimeout(this.watchdog); this.watchdog = undefined;
          if (this.snapshot.state !== 'paused') this.update({state: 'paused'});
        }
      });
      this.handle.setVolume?.(this.snapshot.volume);
      this.armWatchdog(); this.handle.play();
    } catch {this.fail();}
  }
  private fail() {
    this.release(); this.watchdog = undefined;
    if (!this.wanted) return;
    if (!this.online) {this.update({state: 'error', error: 'Sin conexión. Se retomará cuando vuelva internet.'}); return;}
    if (this.totalAttempts >= MAX_TOTAL_ATTEMPTS) {this.giveUp(); return;}
    this.sourceAttempts++;
    if (this.sourceAttempts >= (this.sourceList.length > 1 ? RETRIES_PER_SOURCE : RETRIES_SINGLE_SOURCE)) {
      if (this.sourceIndex + 1 >= this.sourceList.length) {this.giveUp(); return;}
      this.sourceIndex++; this.sourceAttempts = 0;
      this.update({state: 'connecting', error: `Probando fuente alternativa ${this.sourceIndex + 1} de ${this.sourceList.length}…`});
      this.retry = setTimeout(() => this.connect(), 500);
      return;
    }
    const delay = 1000 * 2 ** (this.sourceAttempts - 1);
    this.update({state: 'connecting', error: `Reconectando (intento ${this.sourceAttempts + 1})…`});
    this.retry = setTimeout(() => this.connect(), delay);
  }
  private giveUp() {
    this.wanted = false;
    this.update({state: 'error', error: this.sourceList.length > 1 ? 'Ninguna de las fuentes de esta emisora responde. Reintenta o elige otra.' : 'La emisora no responde. Reintenta o elige otra.'});
  }
  toggle = () => {
    if (['playing', 'connecting', 'buffering'].includes(this.snapshot.state)) {
      this.wanted = false; this.release(); this.watchdog = undefined; this.update({state: 'paused', error: null});
    } else if (this.snapshot.station) this.select(this.snapshot.station);
  };
  setOnline = (online: boolean) => {
    if (this.online === online) return;
    this.online = online;
    if (!online && this.wanted) {this.release(); this.watchdog = undefined; this.update({state: 'error', error: 'Sin conexión. Se retomará cuando vuelva internet.'});}
    else if (online && this.wanted) {this.sourceAttempts = 0; this.totalAttempts = 0; this.connect();}
  };
  setVolume = (value: number) => {
    if (!Number.isFinite(value)) return;
    const volume = Math.max(0, Math.min(1, value));
    this.handle?.setVolume?.(volume); this.update({volume});
  };
  setSleep = (minutes: number) => {
    clearTimeout(this.sleep);
    const sleepAt = minutes > 0 ? this.now() + minutes * 60000 : null;
    this.update({sleepAt});
    if (sleepAt) this.sleep = setTimeout(() => this.checkSleep(), minutes * 60000);
  };
  /** Also called from native status events and app foregrounding, since JS timers can be delayed in background. */
  checkSleep = () => {
    if (this.snapshot.sleepAt && this.now() >= this.snapshot.sleepAt) {
      clearTimeout(this.sleep);
      this.wanted = false; this.release(); this.watchdog = undefined; this.update({state: 'paused', sleepAt: null, error: null});
    }
  };
  dispose = () => {this.wanted = false; this.release(); clearTimeout(this.sleep); this.listeners.clear();};
}
