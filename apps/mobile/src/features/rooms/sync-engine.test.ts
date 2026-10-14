import {describe, expect, it} from 'vitest';
import {correction, defaultSyncConfig, estimateClock, expectedPosition} from './sync-engine';

const html5 = {seek: true, rate: true, remoteControl: true};
const youtube = {seek: true, rate: false, remoteControl: true};
const external = {seek: false, rate: false, remoteControl: false};

describe('shared playback sync', () => {
  it('projects the canonical position with elapsed server time only while playing', () => {
    expect(expectedPosition({positionSeconds: 30, isPlaying: true, updatedAtMs: 1000}, 6000)).toBe(35);
    expect(expectedPosition({positionSeconds: 30, isPlaying: false, updatedAtMs: 1000}, 6000)).toBe(30);
    expect(expectedPosition({positionSeconds: 30, isPlaying: true, updatedAtMs: 6000}, 1000)).toBe(30);
  });
  it('ignores tiny drift and restores normal speed', () => {
    expect(correction(10.2, 10, html5)).toEqual({action: 'rate', rate: 1});
    expect(correction(10.2, 10, youtube)).toEqual({action: 'none'});
  });
  it('absorbs moderate drift progressively on players with speed control', () => {
    expect(correction(12, 10, html5)).toEqual({action: 'rate', rate: 1.05});
    expect(correction(10, 11, html5)).toEqual({action: 'rate', rate: 0.95});
    expect(correction(10.8, 10, html5)).toEqual({action: 'rate', rate: 1.05});
    expect(correction(10.7, 10, html5, {...defaultSyncConfig, maxRateDelta: 0.2})).toEqual({action: 'rate', rate: 1.07});
  });
  it('seeks when drift is large, the player cannot change speed or playback is paused', () => {
    expect(correction(20, 10, html5)).toEqual({action: 'seek', target: 20});
    expect(correction(12, 10, youtube)).toEqual({action: 'none'});
    expect(correction(14, 10, youtube)).toEqual({action: 'seek', target: 14});
    expect(correction(12, 10, html5, defaultSyncConfig, false)).toEqual({action: 'seek', target: 12});
  });
  it('never pretends to control providers without remote control', () => {
    expect(correction(100, 10, external)).toEqual({action: 'none'});
  });
  it('estimates clock offset from the lowest round trip sample', () => {
    const clock = estimateClock([
      {sentMs: 1000, serverMs: 6100, receivedMs: 1400},
      {sentMs: 2000, serverMs: 7050, receivedMs: 2100},
      {sentMs: 3000, serverMs: 8300, receivedMs: 3600},
    ]);
    expect(clock).toEqual({offsetMs: 5000, rttMs: 100, uncertaintyMs: 50});
    expect(estimateClock([])).toBeNull();
    expect(estimateClock([{sentMs: 5, serverMs: 1, receivedMs: 1}])).toBeNull();
    expect(estimateClock([{sentMs: NaN, serverMs: 1, receivedMs: Infinity}])).toBeNull();
  });
  it('reconciles five simulated clocks with latency and a fresh snapshot after disconnection', () => {
    const state = {positionSeconds: 60, isPlaying: true, updatedAtMs: 100000};
    for (const bias of [-7200000, -5000, 0, 60000, 10800000]) {
      const sentMs = 100000 + bias;
      const clock = estimateClock([{sentMs, serverMs: 100100, receivedMs: sentMs + 200}])!;
      expect(expectedPosition(state, 110000 + bias + clock.offsetMs)).toBe(70);
      const resumed = {positionSeconds: 150, isPlaying: false, updatedAtMs: 130000};
      expect(expectedPosition(resumed, 140000 + bias + clock.offsetMs)).toBe(150);
      expect(correction(150, 70, youtube)).toEqual({action: 'seek', target: 150});
    }
  });
});
