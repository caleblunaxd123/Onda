import type {MediaKind} from './types';
import type {PlayerCapabilities} from './sync-engine';

/** Playback contract shared by every provider. Operations a provider cannot do reject with UnsupportedOperation. */
export type PlaybackState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error';
export type ProviderCapabilities = PlayerCapabilities & {play: boolean; subtitles: boolean; restriction?: string};
export interface PlaybackAdapter {
  readonly provider: string;
  readonly capabilities: ProviderCapabilities;
  load(): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seekTo(seconds: number): Promise<void>;
  getCurrentTime(): Promise<number>;
  getDuration(): Promise<number>;
  getState(): Promise<PlaybackState>;
  dispose(): Promise<void>;
}
export class UnsupportedOperation extends Error {
  constructor(readonly provider: string, readonly operation: string) {super(`${provider} no permite «${operation}» desde ONDA.`);}
}

/** What each room media kind really allows (documented in docs/provider-compatibility.md). */
export const providerCapabilities: Record<MediaKind, ProviderCapabilities> = {
  youtube: {play: true, seek: true, rate: false, remoteControl: true, subtitles: true,
    restriction: 'Reproductor IFrame oficial; algunos videos no permiten insertarse (errores 101/150).'},
  video: {play: true, seek: true, rate: true, remoteControl: true, subtitles: false},
  audio: {play: true, seek: true, rate: true, remoteControl: true, subtitles: false},
  radio: {play: true, seek: false, rate: false, remoteControl: true, subtitles: false, restriction: 'En vivo: sin posición compartida.'},
  stream: {play: false, seek: false, rate: false, remoteControl: false, subtitles: false,
    restriction: 'Servicio con DRM sin integración autorizada: se abre en su app oficial y la sala comparte un reloj de referencia.'},
};

/** Command understood by the isolated player page (player-html: YouTube IFrame API or HTML5 media). */
export type FrameCommand = {playing: boolean; position: number; muted: boolean; revision?: number};
export type FrameEvent = {kind: string; position?: number; duration?: number; playing?: boolean};

/**
 * Adapter over the isolated player page. Covers YouTubePlaybackAdapter (IFrame API) and WebEmbedPlaybackAdapter
 * (HTML5) — the page implements the provider calls; this side owns the contract, state and capabilities.
 */
export class FramePlaybackAdapter implements PlaybackAdapter {
  private desired: FrameCommand = {playing: false, position: 0, muted: false};
  private reported = {position: 0, duration: 0, state: 'loading' as PlaybackState};
  private waiting: {resolve: () => void; reject: (e: Error) => void}[] = [];
  private disposed = false;
  constructor(readonly provider: string, readonly capabilities: ProviderCapabilities, private send: (command: FrameCommand) => void) {}
  /** Feed every event coming from the page. */
  handle(event: FrameEvent) {
    if (typeof event.position === 'number') this.reported.position = event.position;
    if (typeof event.duration === 'number' && Number.isFinite(event.duration)) this.reported.duration = event.duration;
    if (event.kind === 'ready') {this.reported.state = 'ready'; this.flushWaiters();}
    else if (event.kind === 'started') this.reported.state = 'playing';
    else if (event.kind === 'control' || event.kind === 'progress') {if (this.reported.state !== 'loading') this.reported.state = event.playing ? 'playing' : event.kind === 'control' ? 'paused' : this.reported.state;}
    else if (event.kind === 'ended') this.reported.state = 'ended';
    else if (event.kind === 'error') {this.reported.state = 'error'; this.flushWaiters(new Error('El reproductor informó un error.'));}
  }
  /** Applies the room's canonical state (used by the sync loop). */
  sync(command: FrameCommand) {this.desired = command; this.push();}
  load() {
    if (this.reported.state !== 'loading') return Promise.resolve();
    return new Promise<void>((resolve, reject) => this.waiting.push({resolve, reject}));
  }
  async play() {this.require('play', 'reproducir'); this.desired = {...this.desired, playing: true}; this.pushManual();}
  async pause() {this.require('play', 'pausar'); this.desired = {...this.desired, playing: false}; this.pushManual();}
  async seekTo(seconds: number) {
    this.require('seek', 'saltar a un momento');
    if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Posición inválida.');
    this.desired = {...this.desired, position: seconds}; this.pushManual();
  }
  async getCurrentTime() {return this.reported.position;}
  async getDuration() {return this.reported.duration;}
  async getState() {return this.reported.state;}
  async dispose() {this.disposed = true; this.flushWaiters(new Error('Reproductor cerrado.'));}
  private push() {if (!this.disposed) this.send(this.desired);}
  private pushManual() {if (!this.disposed) {const {revision: _revision, ...command} = this.desired; this.send(command);}}
  private require(capability: 'play' | 'seek', operation: string) {if (!this.capabilities[capability]) throw new UnsupportedOperation(this.provider, operation);}
  private flushWaiters(error?: Error) {const list = this.waiting; this.waiting = []; for (const w of list) if (error) w.reject(error); else w.resolve();}
}

/** Subscription services without an authorized integration: honest, everything is reported as unsupported. */
export class ExternalProviderAdapter implements PlaybackAdapter {
  readonly capabilities = providerCapabilities.stream;
  constructor(readonly provider: string) {}
  async load() {}
  async play() {throw new UnsupportedOperation(this.provider, 'reproducir');}
  async pause() {throw new UnsupportedOperation(this.provider, 'pausar');}
  async seekTo() {throw new UnsupportedOperation(this.provider, 'saltar a un momento');}
  async getCurrentTime(): Promise<number> {throw new UnsupportedOperation(this.provider, 'leer la posición');}
  async getDuration(): Promise<number> {throw new UnsupportedOperation(this.provider, 'leer la duración');}
  async getState(): Promise<PlaybackState> {return 'idle';}
  async dispose() {}
}
