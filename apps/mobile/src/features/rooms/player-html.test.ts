/// <reference types="node" />
import {runInNewContext} from 'node:vm';
import {describe, expect, it} from 'vitest';
import {roomPlayerHtml} from './player-html';
import type {FrameCommand} from './playback-adapters';

/** Executes our generated bridge, with a simulated official IFrame API (no network/provider internals). */
function youtubeBridge(host: boolean, initialStatus = 2, bufferOnSeek = false) {
  let now = 10000, position = 0, status = initialStatus, muted = false, cuedAt = 0, cues = 0, pauseCalls = 0;
  let pendingSeek: number | null = null;
  let events: {onReady: () => void; onStateChange: (event: {data: number}) => void};
  let poll: () => void;
  const sent: {kind: string; position?: number; playing?: boolean}[] = [];
  const window = {ReactNativeWebView: {postMessage: (text: string) => sent.push(JSON.parse(text))},
    addEventListener: () => {}, onYouTubeIframeAPIReady: () => {}, setRoomPlayback: (_state: FrameCommand) => {}};
  const player = {getCurrentTime: () => position, getPlayerState: () => status, getDuration: () => 600,
    getVideoUrl: () => 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    seekTo: (value: number) => {if (bufferOnSeek) {pendingSeek = value; status = 3;} else position = value;},
    cueVideoById: (options: {startSeconds: number}) => {cues++; cuedAt = options.startSeconds; position = 0; status = 5; events.onStateChange({data: 5});},
    playVideo: () => {if (status === 5) position = cuedAt; status = 1; events.onStateChange({data: 1});},
    pauseVideo: () => {pauseCalls++; pendingSeek = null; status = 2; events.onStateChange({data: 2});},
    mute: () => {muted = true;}, unMute: () => {muted = false;}};
  const html = roomPlayerHtml({kind: 'youtube', url: player.getVideoUrl(), videoId: 'aqz-KE-bpKQ', title: 'QA', station: null}, host, 'https://onda.lunalav.pe');
  const script = html.match(/<script>([\s\S]*)<\/script>/)![1];
  runInNewContext(script, {window, parent: {}, URL, Date: {now: () => now},
    document: {createElement: () => ({}), head: {appendChild: () => {}}},
    YT: {Player: function (_id: string, options: {events: typeof events}) {events = options.events; return player;}},
    setInterval: (callback: () => void) => {poll = callback;}});
  window.onYouTubeIframeAPIReady();
  events!.onReady();
  const tick = (milliseconds = 500) => {if (status === 1) position += milliseconds / 1000; now += milliseconds; poll!();};
  return {sent, tick, command: window.setRoomPlayback,
    seek: (value: number) => {position = value;}, pause: player.pauseVideo, play: player.playVideo,
    position: () => position, status: () => status, muted: () => muted, cues: () => cues,
    pauseCalls: () => pauseCalls, finishSeek: () => {if (pendingSeek !== null) {position = pendingSeek; pendingSeek = null; status = 2; events.onStateChange({data: 2});}},
    controls: () => sent.filter(x => x.kind === 'control')};
}

describe('generated YouTube playback bridge', () => {
  it('does not cancel a paused seek when the provider temporarily enters buffering', () => {
    const bridge = youtubeBridge(true, 2, true);
    bridge.command({playing: false, position: 30, muted: false, revision: 1});
    expect(bridge.status()).toBe(3);
    expect(bridge.pauseCalls()).toBe(0);
    bridge.finishSeek(); bridge.tick(1500);
    bridge.command({playing: false, position: 40, muted: false, revision: 2});
    bridge.tick(500); bridge.finishSeek(); bridge.tick(1500);
    expect(bridge.position()).toBe(40);
    expect(bridge.pauseCalls()).toBe(0);
    expect(bridge.controls()).toHaveLength(0);
  });
  it('cues a paused late join at its anchor without seek/pause cancelling the official thumbnail', () => {
    for (const host of [true, false]) {
      const bridge = youtubeBridge(host, -1);
      bridge.command({playing: false, position: 120, muted: false, revision: 5});
      bridge.tick(2000);
      bridge.command({playing: false, position: 120, muted: false, revision: 5});
      expect(bridge.status()).toBe(5);
      expect(bridge.position()).toBe(0); // No video requested until playing; progress reports the room anchor.
      expect(bridge.sent.find(x => x.kind === 'progress')?.position).toBe(120);
      expect(bridge.cues()).toBe(1);
      expect(bridge.controls()).toHaveLength(0);
      bridge.command({playing: true, position: 120, muted: false, revision: 6});
      expect(bridge.status()).toBe(1);
      expect(bridge.position()).toBe(120);
    }
  });
  it('shares a paused controller seek once and preserves it until the server acknowledges', () => {
    const bridge = youtubeBridge(true);
    bridge.command({playing: false, position: 30, muted: false, revision: 1});
    bridge.tick(1500);
    bridge.seek(40);
    bridge.command({playing: false, position: 30, muted: true, revision: 1});
    expect(bridge.position()).toBe(40);
    expect(bridge.muted()).toBe(true);
    bridge.tick(); bridge.tick();
    expect(bridge.controls()).toEqual([{kind: 'control', playing: false, position: 40}]);
    bridge.command({playing: false, position: 40, muted: false, revision: 2});
    bridge.command({playing: false, position: 20, muted: false, revision: 3});
    bridge.tick(2000);
    expect(bridge.position()).toBe(20);
    expect(bridge.controls()).toHaveLength(1); // Remote corrections must not echo back into room controls.
  });

  it('restores a guest seek even while paused without publishing a control', () => {
    const bridge = youtubeBridge(false);
    bridge.command({playing: false, position: 30, muted: false, revision: 4});
    bridge.tick(1500); bridge.seek(50); bridge.tick();
    expect(bridge.position()).toBe(30);
    expect(bridge.controls()).toHaveLength(0);
    bridge.command({playing: false, position: 10, muted: true, revision: 3});
    expect(bridge.position()).toBe(30);
    expect(bridge.muted()).toBe(false); // An obsolete frame command is rejected altogether.
  });

  it('publishes local pause and playing seek, while a connection loss can pause the same revision', () => {
    const bridge = youtubeBridge(true);
    bridge.command({playing: true, position: 30, muted: false, revision: 1});
    bridge.tick(2000);
    expect(bridge.controls()).toHaveLength(0);
    bridge.seek(90); bridge.tick();
    expect(bridge.controls()[0]).toMatchObject({playing: true, position: 90.5});
    bridge.command({playing: true, position: 90.5, muted: false, revision: 2});
    bridge.tick(1500); bridge.pause();
    expect(bridge.controls().at(-1)).toMatchObject({playing: false, position: 92});
    bridge.command({playing: false, position: 92, muted: false, revision: 3});
    bridge.tick(1500); bridge.play();
    bridge.command({playing: false, position: 92, muted: false, revision: 3});
    expect(bridge.status()).toBe(1); // Same-revision projection does not overwrite local play.
    bridge.command({playing: true, position: 92, muted: false, revision: 4});
    bridge.command({playing: false, position: 92, muted: false, revision: 4});
    expect(bridge.status()).toBe(2); // Disconnection changes the desired playing state, even at the same revision.
  });
});
