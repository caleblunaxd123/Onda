import {describe, expect, it} from 'vitest';
import {orderedQueue, playbackPosition, projectedPosition} from './types';
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
