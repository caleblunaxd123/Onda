import {describe, expect, it} from 'vitest';
import {formatClock, orderedQueue, parseClock, playbackPosition, projectedPosition, streamServiceOf} from './types';
import {roomPlayerHtml} from './player-html';
describe('shared media timeline', () => {
  it('keeps transport anchors current when a local control is applied later', () => {
    expect(projectedPosition(20, true, 1000, 6000)).toBe(25);
    expect(projectedPosition(20, false, 1000, 6000)).toBe(20);
    expect(projectedPosition(20, true, 6000, 1000)).toBe(20);
  });
  it('keeps a pinned proposal ahead of votes without mutating the saved queue', () => {
    const media = {kind: 'video' as const, title: 'Prueba', url: 'https://example.test/video.mp4', videoId: null, station: null};
    const queue = [{id: 'popular', media, proposedBy: 'a', votes: 20}, {id: 'pinned', media, proposedBy: 'b', votes: 1, pinned: true}];
    expect(orderedQueue(queue).map(x => x.id)).toEqual(['pinned', 'popular']);
    expect(queue[0].id).toBe('popular');
  });
  it('advances only playing media and accounts for server clock offset', () => {
    const room = {isPlaying: true, positionSeconds: 10, playbackUpdatedAt: '2026-10-13T12:00:00Z'};
    expect(playbackPosition(room, Date.parse('2026-10-13T12:00:02Z'), 1000)).toBe(13);
    expect(playbackPosition({...room, isPlaying: false}, Date.parse('2026-10-13T12:30:00Z'))).toBe(10);
    expect(playbackPosition(room, Date.parse('2026-10-13T11:59:00Z'))).toBe(10);
  });
  it('escapes provider data so room titles cannot insert scripts into the embed', () => {
    const html = roomPlayerHtml({kind: 'video', title: '</script><script>attack()</script>', url: 'https://example.test/video.mp4', videoId: null, station: null}, false, 'https://onda-api.lunalav.pe');
    expect(html).not.toContain('</script><script>attack()');
    expect(html).toContain('\\u003c/script>');
    expect(html).not.toContain('Bearer');
  });
});

describe('watch with your own account', () => {
  it('recognizes only official title links, like the server', () => {
    expect(streamServiceOf('https://www.netflix.com/watch/81234567?trackId=1')?.id).toBe('netflix');
    expect(streamServiceOf('https://www.netflix.com/pe/title/80100172')?.id).toBe('netflix');
    expect(streamServiceOf('https://www.amazon.com/gp/video/detail/B0XYZ')?.label).toBe('Prime Video');
    expect(streamServiceOf('https://play.max.com/video/watch/x')?.id).toBe('max');
    expect(streamServiceOf('https://www.netflix.com/browse')).toBeNull();
    expect(streamServiceOf('http://www.netflix.com/watch/1')).toBeNull();
    expect(streamServiceOf('https://netflix.com.evil.example/watch/1')).toBeNull();
    expect(streamServiceOf('https://www.netflix.com:8443/watch/1')).toBeNull();
    expect(streamServiceOf('no es un enlace')).toBeNull();
  });
  it('formats and parses the shared clock', () => {
    expect(formatClock(75)).toBe('1:15');
    expect(formatClock(3723)).toBe('1:02:03');
    expect(parseClock('1:02:03')).toBe(3723);
    expect(parseClock('12:34')).toBe(754);
    expect(parseClock('95')).toBe(95);
    expect(parseClock('1:75')).toBeNull();
    expect(parseClock('abc')).toBeNull();
  });
});

describe('isolated room player page', () => {
  it('generates valid JavaScript carrying the sync configuration', () => {
    for (const kind of ['youtube', 'video'] as const) {
      const html = roomPlayerHtml({kind, title: 'x', url: 'https://example.com/a.mp4', videoId: kind === 'youtube' ? 'M7lc1UVf-VE' : null, station: null}, false, 'https://onda.lunalav.pe',
        {tolerance: 0.4, seekThreshold: 2.5, maxRateDelta: 0.04, correctionWindow: 8});
      const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
      expect(() => new Function(script)).not.toThrow();
      expect(script).toContain('"seekThreshold":2.5');
      expect(script).not.toContain('</script');
    }
  });
});
