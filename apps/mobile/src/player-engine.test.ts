import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerEngine, streamSources, MAX_TOTAL_ATTEMPTS, type NativeStatus } from './player-engine';
import type { Station } from './types';
const station: Station = {id: 'one', name: 'One', country: 'Peru', countryCode: 'PE', language: 'spanish', tags: [], streamUrl: 'https://example.com/live', artworkUrl: null, codec: 'MP3', bitrate: 128, votes: 1, latitude: null, longitude: null};
const playing: NativeStatus = {loaded: true, playing: true, buffering: false};

describe('Global audio lifecycle', () => {
  beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());
  const setup = () => {
    const handles: {url: string; station: string; dispose: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; emit: (s: NativeStatus) => void}[] = [];
    const engine = new PlayerEngine((s, url, emit) => {const h = {url, station: s.id, play: vi.fn(), pause: vi.fn(), dispose: vi.fn(), emit}; handles.push(h); return h;}, () => Date.now());
    return {engine, handles};
  };
  it('applies volume to the active stream and preserves it when switching stations', () => {
    const volumes: ReturnType<typeof vi.fn>[] = [];
    const engine = new PlayerEngine(() => {const setVolume = vi.fn(); volumes.push(setVolume); return {play: vi.fn(), pause: vi.fn(), dispose: vi.fn(), setVolume};});
    engine.setVolume(.35); engine.select(station);
    expect(volumes[0]).toHaveBeenLastCalledWith(.35);
    engine.setVolume(0); expect(volumes[0]).toHaveBeenLastCalledWith(0);
    engine.select({...station, id:'next'}); expect(volumes[1]).toHaveBeenLastCalledWith(0);
    engine.setVolume(2); expect(engine.snapshot.volume).toBe(1);
    engine.setVolume(Number.NaN); expect(engine.snapshot.volume).toBe(1);
    engine.dispose();
  });
  it('disposes the previous stream and ignores its late callbacks', () => {
    const {engine, handles} = setup(); engine.select(station); engine.select({...station, id: 'two'});
    expect(handles[0].dispose).toHaveBeenCalledOnce();
    handles[0].emit(playing); expect(engine.snapshot.state).toBe('connecting');
    handles[1].emit(playing); expect(engine.snapshot.state).toBe('playing');
    engine.dispose();
  });
  it('keeps a single live stream when switching quickly between 20 stations', () => {
    const {engine, handles} = setup();
    for (let i = 0; i < 20; i++) engine.select({...station, id: 's' + i, streamUrl: `https://example.com/${i}`});
    const alive = handles.filter(h => h.dispose.mock.calls.length === 0);
    expect(handles).toHaveLength(20);
    expect(alive).toHaveLength(1);
    expect(alive[0].station).toBe('s19');
    handles.slice(0, 19).forEach(h => h.emit(playing));
    expect(engine.snapshot.state).toBe('connecting');
    expect(engine.snapshot.station?.id).toBe('s19');
    engine.dispose();
  });
  it('reports connecting, not playing, until the native player produces audio', () => {
    const {engine, handles} = setup(); engine.select(station);
    expect(engine.snapshot.state).toBe('connecting');
    handles[0].emit({loaded: true, playing: false, buffering: true});
    expect(engine.snapshot.state).toBe('buffering');
    handles[0].emit(playing);
    expect(engine.snapshot.state).toBe('playing');
    engine.dispose();
  });
  it('uses bounded retries on a single source and reports an unavailable stream', () => {
    const {engine, handles} = setup(); engine.select(station); vi.advanceTimersByTime(120000);
    expect(handles).toHaveLength(4); expect(engine.snapshot.state).toBe('error'); engine.dispose();
  });
  it('fails over to verified alternative sources in order and recovers', () => {
    const {engine, handles} = setup();
    engine.select({...station, streams: ['https://example.com/live', 'https://backup.example/a', 'http://insecure.example/b', 'https://backup.example/c']});
    expect(engine.snapshot.sources).toBe(3);
    handles[0].emit({loaded: false, playing: false, buffering: false, error: true});
    vi.advanceTimersByTime(1000);
    expect(handles[1].url).toBe('https://example.com/live');
    handles[1].emit({loaded: false, playing: false, buffering: false, error: true});
    expect(engine.snapshot.error).toContain('fuente alternativa 2 de 3');
    vi.advanceTimersByTime(500);
    expect(handles[2].url).toBe('https://backup.example/a');
    handles[2].emit(playing);
    expect(engine.snapshot).toMatchObject({state: 'playing', error: null, source: 2});
    engine.dispose();
  });
  it('caps the total number of attempts across all sources', () => {
    const {engine, handles} = setup();
    engine.select({...station, streams: ['https://a/1', 'https://a/2', 'https://a/3', 'https://a/4']});
    vi.advanceTimersByTime(600000);
    expect(handles.length).toBeLessThanOrEqual(MAX_TOTAL_ATTEMPTS);
    expect(engine.snapshot.state).toBe('error');
    engine.dispose();
  });
  it('lists only distinct HTTPS sources, main stream first', () => {
    expect(streamSources({...station, streams: ['http://x', 'https://example.com/live', 'https://y']})).toEqual(['https://example.com/live', 'https://y']);
  });
  it('does not reconnect after user pauses while waiting', () => {
    const {engine, handles} = setup(); engine.select(station); engine.toggle(); vi.advanceTimersByTime(60000);
    expect(handles).toHaveLength(1); expect(engine.snapshot.state).toBe('paused'); engine.dispose();
  });
  it('reconnects only if playback was requested when internet returns', () => {
    const {engine, handles} = setup(); engine.select(station); engine.setOnline(false); engine.setOnline(true);
    expect(handles).toHaveLength(2); engine.toggle(); engine.setOnline(false); engine.setOnline(true); expect(handles).toHaveLength(2); engine.dispose();
  });
  it('sleep timer disposes audio and prevents retries', () => {
    const {engine, handles} = setup(); engine.select(station); handles[0].emit(playing); engine.setSleep(1); vi.advanceTimersByTime(60000);
    expect(engine.snapshot.state).toBe('paused'); expect(handles[0].dispose).toHaveBeenCalledOnce(); engine.dispose();
  });
  it('sleep timer also fires from native status events when JS timers were delayed', () => {
    let now = 0;
    const handles: {emit: (s: NativeStatus) => void; dispose: ReturnType<typeof vi.fn>}[] = [];
    const engine = new PlayerEngine((_, __, emit) => {const h = {play: vi.fn(), pause: vi.fn(), dispose: vi.fn(), emit}; handles.push(h); return h;}, () => now);
    engine.select(station); handles[0].emit(playing); engine.setSleep(30);
    now = 31 * 60000; // the device slept: the timeout has not run yet
    handles[0].emit(playing);
    expect(engine.snapshot.state).toBe('paused'); expect(handles[0].dispose).toHaveBeenCalledOnce();
    engine.dispose();
  });
  it('refuses stations without an HTTPS stream', () => {
    const {engine, handles} = setup(); engine.select({...station, streamUrl: 'file:///private'});
    expect(handles).toHaveLength(0); expect(engine.snapshot.state).toBe('error'); engine.dispose();
  });
  it('respects a pause from lock-screen controls or an interruption when connectivity changes', () => {
    const {engine, handles} = setup(); engine.select(station);
    handles[0].emit(playing);
    handles[0].emit({loaded: true, playing: false, buffering: false});
    engine.setOnline(false); engine.setOnline(true);
    expect(engine.snapshot.state).toBe('paused'); expect(handles).toHaveLength(1); engine.dispose();
  });
  it('manual retry starts again from the first source', () => {
    const {engine, handles} = setup(); engine.select(station); vi.advanceTimersByTime(120000);
    expect(engine.snapshot.state).toBe('error');
    engine.retryNow();
    expect(engine.snapshot.state).toBe('connecting'); expect(handles.at(-1)!.url).toBe(station.streamUrl);
    engine.dispose();
  });
});
