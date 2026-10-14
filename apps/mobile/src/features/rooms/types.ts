import type {Station} from '../../types';
export type MediaKind = 'radio' | 'youtube' | 'audio' | 'video' | 'stream';
export type MediaInput = {kind: MediaKind; stationId?: string; url?: string; title?: string};
export type RoomMedia = {kind: MediaKind; title: string; url: string | null; videoId: string | null; station: Station | null; category?: string};
export type Member = {id: string; name: string; avatarUrl?: string | null};
export type QueueItem = {id: string; media: RoomMedia; proposedBy: string; votes: number; pinned?: boolean};
export type Room = {id: string; name: string; isPrivate: boolean; ownerId: string; inviteCode: string | null; media: RoomMedia; isPlaying: boolean;
  positionSeconds: number; playbackUpdatedAt: string; version: number; members: Member[]; queue: QueueItem[]; serverNow: string;
  cohosts?: string[]; autoRecovery?: boolean; hostAbsentSince?: string | null};
/** Membership can change at the same playback revision; only an older revision or another room is stale. */
export function acceptsRoomState(current: Pick<Room, 'id' | 'version'> | null, incoming: Pick<Room, 'id' | 'version'>) {
  return Number.isSafeInteger(incoming.version) && incoming.version >= 0 &&
    (!current || current.id === incoming.id && incoming.version >= current.version);
}
export type RoomSummary = Pick<Room, 'id' | 'name' | 'isPrivate' | 'ownerId' | 'media'> & {listeners: number; members?: Member[]};
export type ChatReaction = {accountId: string; name: string; emoji: string};
export type ChatAttachment = {id: string; name: string; mime: string; kind: 'image' | 'audio' | 'file'; length: number; durationMs?: number | null};
export type ChatReply = {id: string; sender: string; text: string; deleted: boolean; senderId?: string | null};
export type ChatMessage = {id: string; senderId: string; sender: string; text: string; kind: string; at: string;
  replyToId?: string | null; reply?: ChatReply | null; editedAt?: string | null; deleted?: boolean;
  reactions?: ChatReaction[] | null; attachments?: ChatAttachment[] | null; revision?: number; pinned?: boolean};
export function orderedQueue(items: QueueItem[]) {return [...items].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.votes - a.votes);}
export function projectedPosition(position: number, playing: boolean, at?: number, now = Date.now()) {
  return Math.max(0, position + (playing && at !== undefined ? Math.max(0, now - at) / 1000 : 0));
}
export const mediaLabel: Record<MediaKind, string> = {radio: 'Radio en vivo', youtube: 'YouTube', audio: 'Música', video: 'Video', stream: 'Con tu cuenta'};
/** Subscription services watched with each person's own account. ONDA shares the clock and chat, never the content. */
export const streamServices = [
  {id: 'netflix', label: 'Netflix', color: '#E50914', home: 'https://www.netflix.com/browse'},
  {id: 'prime', label: 'Prime Video', color: '#1A98FF', home: 'https://www.primevideo.com'},
  {id: 'disney', label: 'Disney+', color: '#2E7BFF', home: 'https://www.disneyplus.com'},
  {id: 'max', label: 'Max', color: '#5B5BFF', home: 'https://play.max.com'},
  {id: 'appletv', label: 'Apple TV+', color: '#A6B3C4', home: 'https://tv.apple.com'},
  {id: 'crunchyroll', label: 'Crunchyroll', color: '#F47521', home: 'https://www.crunchyroll.com'},
  {id: 'paramount', label: 'Paramount+', color: '#0064FF', home: 'https://www.paramountplus.com'},
  {id: 'mubi', label: 'MUBI', color: '#C8D2E0', home: 'https://mubi.com'},
] as const;
export type StreamService = (typeof streamServices)[number];
/** Mirrors the server allow-list (MediaResolver.StreamService): official hosts and title/watch paths only. */
export function streamServiceOf(raw?: string | null): StreamService | null {
  let url: URL;
  try {url = new URL((raw ?? '').trim());} catch {return null;}
  if (url.protocol !== 'https:' || url.port || url.username || url.password || url.pathname.length <= 1) return null;
  const host = url.hostname.toLowerCase(); const path = url.pathname.toLowerCase();
  const id = ['netflix.com', 'www.netflix.com'].includes(host) ? (path.startsWith('/watch/') || path.includes('/title/') ? 'netflix' : null)
    : ['primevideo.com', 'www.primevideo.com', 'app.primevideo.com'].includes(host) ? 'prime'
    : ['amazon.com', 'www.amazon.com'].includes(host) ? (path.includes('/gp/video/') || path.startsWith('/dp/') ? 'prime' : null)
    : ['disneyplus.com', 'www.disneyplus.com'].includes(host) ? 'disney'
    : ['max.com', 'www.max.com', 'play.max.com', 'hbomax.com', 'www.hbomax.com', 'play.hbomax.com'].includes(host) ? 'max'
    : host === 'tv.apple.com' ? 'appletv'
    : ['crunchyroll.com', 'www.crunchyroll.com'].includes(host) ? 'crunchyroll'
    : ['paramountplus.com', 'www.paramountplus.com'].includes(host) ? 'paramount'
    : ['mubi.com', 'www.mubi.com'].includes(host) ? 'mubi' : null;
  return streamServices.find(x => x.id === id) ?? null;
}
export function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600), m = Math.floor(total % 3600 / 60), s = total % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : String(m)) + ':' + String(s).padStart(2, '0');
}
/** Parses «1:02:03», «12:34» or «95» into seconds; null when it is not a time. */
export function parseClock(text: string) {
  const parts = text.trim().split(':');
  if (!parts.length || parts.length > 3 || parts.some(x => !/^\d{1,3}$/.test(x))) return null;
  const numbers = parts.map(Number);
  if (numbers.slice(1).some(x => x > 59)) return null;
  const seconds = numbers.reduce((total, x) => total * 60 + x, 0);
  return seconds <= 86400 ? seconds : null;
}
export function playbackPosition(room: Pick<Room, 'isPlaying' | 'positionSeconds' | 'playbackUpdatedAt'>, now = Date.now(), clockOffset = 0) {
  return Math.max(0, room.positionSeconds + (room.isPlaying ? Math.max(0, (now + clockOffset - Date.parse(room.playbackUpdatedAt)) / 1000) : 0));
}
