import type { PlaybackState, Station } from './types';
export type NativeStatus = {playing: boolean; loaded: boolean; buffering: boolean; error?: boolean; finished?: boolean};
export type Handle = {play(): void; pause(): void; dispose(): void};
export type Snapshot = {station: Station | null; state: PlaybackState; error: string | null; sleepAt: number | null};
export class PlayerEngine {
  snapshot: Snapshot = {station: null, state: 'idle', error: null, sleepAt: null};
  private listeners = new Set<() => void>();
  private handle?: Handle;
  private generation = 0;
  private attempts = 0;
  private wanted = false;
  private online = true;
  private retry?: ReturnType<typeof setTimeout>;
  private watchdog?: ReturnType<typeof setTimeout>;
  private sleep?: ReturnType<typeof setTimeout>;
  constructor(private factory: (s: Station, onStatus: (status: NativeStatus) => void) => Handle) {}
  subscribe = (listener: () => void) => {this.listeners.add(listener); return () => {this.listeners.delete(listener);};};
  getSnapshot = () => this.snapshot;
  private update(patch: Partial<Snapshot>) {this.snapshot = {...this.snapshot, ...patch}; this.listeners.forEach(f => f());}
  private release() {
    this.generation++; clearTimeout(this.retry); clearTimeout(this.watchdog); this.watchdog = undefined;
    this.handle?.dispose(); this.handle = undefined;
  }
  select = (station: Station) => {
    this.release(); this.attempts = 0; this.wanted = true;
    this.update({station, error: null});
    if (!/^https:\/\//i.test(station.streamUrl)) {this.wanted = false; this.update({state:'error', error:'Esta transmisión necesita una URL HTTPS compatible.'}); return;}
    this.connect();
  };
  private armWatchdog() {
    if (!this.watchdog) this.watchdog = setTimeout(() => {this.watchdog = undefined; this.fail();}, 15000);
  }
  private connect() {
    const station = this.snapshot.station;
    if (!station || !this.wanted) return;
    if (!this.online) {this.update({state:'error', error:'Sin conexión. Se retomará cuando vuelva internet.'}); return;}
    this.update({state:'connecting', error:null});
    const generation = this.generation;
    try {
      this.handle = this.factory(station, status => {
        if (generation !== this.generation) return;
        if (status.error || status.finished) {this.fail(); return;}
        if (status.playing && !status.buffering) {
          this.wanted = true;
          clearTimeout(this.watchdog); this.watchdog = undefined;
          this.update({state:'playing', error:null});
        } else if (status.buffering || !status.loaded) {
          this.update({state: status.loaded ? 'buffering' : 'connecting'}); this.armWatchdog();
        } else if (this.snapshot.state === 'playing' || this.snapshot.state === 'paused') {
          this.wanted = false;
          clearTimeout(this.watchdog); this.watchdog = undefined;
          this.update({state:'paused'});
        }
      });
      this.armWatchdog(); this.handle.play();
    } catch {this.fail();}
  }
  private fail() {
    this.release(); this.watchdog = undefined;
    if (!this.wanted) return;
    if (!this.online) {this.update({state:'error', error:'Sin conexión.'}); return;}
    if (this.attempts >= 3) {this.update({state:'error', error:'La emisora no responde. Reintenta o elige otra.'}); return;}
    const delay = 1000 * 2 ** this.attempts++;
    this.update({state:'connecting', error:'Reconectando…'});
    this.retry = setTimeout(() => this.connect(), delay);
  }
  toggle = () => {
    if (['playing','connecting','buffering'].includes(this.snapshot.state)) {
      this.wanted = false; this.release(); this.watchdog = undefined; this.update({state:'paused', error:null});
    } else if (this.snapshot.station) this.select(this.snapshot.station);
  };
  setOnline = (online: boolean) => {
    if (this.online === online) return;
    this.online = online;
    if (!online && this.wanted) {this.release(); this.watchdog = undefined; this.update({state:'error', error:'Sin conexión. Se retomará cuando vuelva internet.'});}
    else if (online && this.wanted) {this.attempts = 0; this.connect();}
  };
  setSleep = (minutes: number) => {
    clearTimeout(this.sleep);
    const sleepAt = minutes > 0 ? Date.now() + minutes * 60000 : null;
    this.update({sleepAt});
    if (sleepAt) this.sleep = setTimeout(() => this.checkSleep(), minutes * 60000);
  };
  checkSleep = () => {
    if (this.snapshot.sleepAt && Date.now() >= this.snapshot.sleepAt) {
      this.wanted = false; this.release(); this.watchdog = undefined; this.update({state:'paused', sleepAt:null});
    }
  };
  dispose = () => {this.wanted = false; this.release(); clearTimeout(this.sleep); this.listeners.clear();};
}
