import type {Station} from '../../types';
export type MediaKind = 'radio' | 'youtube' | 'audio' | 'video';
export type MediaInput = {kind: MediaKind; stationId?: string; url?: string; title?: string};
export type RoomMedia = {kind: MediaKind; title: string; url: string | null; videoId: string | null; station: Station | null; category?: string};
export type Member = {id: string; name: string};
export type QueueItem = {id: string; media: RoomMedia; proposedBy: string; votes: number; pinned?: boolean};
export type Room = {id: string; name: string; isPrivate: boolean; ownerId: string; inviteCode: string | null; media: RoomMedia; isPlaying: boolean;
  positionSeconds: number; playbackUpdatedAt: string; version: number; members: Member[]; queue: QueueItem[]; serverNow: string;
  cohosts?: string[]; autoRecovery?: boolean; hostAbsentSince?: string | null};
export type RoomSummary = Pick<Room, 'id' | 'name' | 'isPrivate' | 'ownerId' | 'media'> & {listeners: number};
export type ChatMessage = {id: string; senderId: string; sender: string; text: string; kind: string; at: string};
export function orderedQueue(items: QueueItem[]) {return [...items].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.votes - a.votes);}
export function projectedPosition(position: number, playing: boolean, at?: number, now = Date.now()) {
  return Math.max(0, position + (playing && at !== undefined ? Math.max(0, now - at) / 1000 : 0));
}
export const mediaLabel: Record<MediaKind, string> = {radio: 'Radio en vivo', youtube: 'YouTube', audio: 'Música', video: 'Video'};
export function playbackPosition(room: Pick<Room, 'isPlaying' | 'positionSeconds' | 'playbackUpdatedAt'>, now = Date.now(), clockOffset = 0) {
  return Math.max(0, room.positionSeconds + (room.isPlaying ? Math.max(0, (now + clockOffset - Date.parse(room.playbackUpdatedAt)) / 1000) : 0));
}
