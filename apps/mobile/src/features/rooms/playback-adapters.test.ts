import {describe, expect, it} from 'vitest';
import {ExternalProviderAdapter, FramePlaybackAdapter, providerCapabilities, UnsupportedOperation, type FrameCommand} from './playback-adapters';

describe('playback adapters', () => {
  it('drives the isolated player through commands and reports its state', async () => {
    const sent: FrameCommand[] = [];
    const adapter = new FramePlaybackAdapter('YouTube', providerCapabilities.youtube, command => sent.push(command));
    const loaded = adapter.load();
    adapter.handle({kind: 'ready'});
    await loaded;
    await adapter.play(); await adapter.seekTo(42); await adapter.pause();
    expect(sent).toEqual([{playing: true, position: 0, muted: false}, {playing: true, position: 42, muted: false}, {playing: false, position: 42, muted: false}]);
    adapter.handle({kind: 'progress', position: 43.5, duration: 600, playing: true});
    expect([await adapter.getCurrentTime(), await adapter.getDuration(), await adapter.getState()]).toEqual([43.5, 600, 'playing']);
    adapter.handle({kind: 'control', playing: false, position: 44});
    expect(await adapter.getState()).toBe('paused');
    await expect(adapter.seekTo(-1)).rejects.toThrow(RangeError);
  });
  it('rejects loading when the provider reports an error', async () => {
    const adapter = new FramePlaybackAdapter('YouTube', providerCapabilities.youtube, () => {});
    const loaded = adapter.load();
    adapter.handle({kind: 'error'});
    await expect(loaded).rejects.toThrow();
    expect(await adapter.getState()).toBe('error');
  });
  it('reports unsupported operations instead of pretending', async () => {
    const radio = new FramePlaybackAdapter('Radio', providerCapabilities.radio, () => {});
    await expect(radio.seekTo(10)).rejects.toBeInstanceOf(UnsupportedOperation);
    const netflix = new ExternalProviderAdapter('Netflix');
    await expect(netflix.play()).rejects.toThrow('Netflix no permite «reproducir» desde ONDA.');
    await expect(netflix.getCurrentTime()).rejects.toBeInstanceOf(UnsupportedOperation);
    expect(netflix.capabilities.remoteControl).toBe(false);
  });
});
