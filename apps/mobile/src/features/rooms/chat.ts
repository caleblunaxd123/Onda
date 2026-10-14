import type {ChatAttachment, ChatMessage, ChatReply} from './types';

/** Pure chat-state helpers shared by the SignalR client and the UI. Kept free of React/IO so they are unit tested. */
export const chatLimits = {text: 2000, attachments: 3, bytes: 10 * 1024 * 1024, editMinutes: 15, memory: 2000, voiceSeconds: 180};
export const deletedText = 'Mensaje eliminado';
const order = (a: ChatMessage, b: ChatMessage) => Date.parse(a.at) - Date.parse(b.at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function attachmentLabel(items?: ChatAttachment[] | null) {
  const first = items?.[0];
  return !first ? 'Adjunto' : first.kind === 'image' ? 'Foto' : first.kind === 'audio' ? 'Nota de voz' : first.name;
}
/** Mirrors the server quote so live edits/deletes refresh replies without reloading history. */
export function quoteOf(message: ChatMessage): ChatReply {
  if (message.deleted) return {id: message.id, sender: message.sender, text: deletedText, deleted: true};
  return {id: message.id, sender: message.sender, text: message.text ? message.text.slice(0, 160) : attachmentLabel(message.attachments), deleted: false};
}
function refreshQuotes(list: ChatMessage[], changed: ChatMessage) {
  return list.map(x => x.replyToId === changed.id && !x.deleted ? {...x, reply: quoteOf(changed)} : x);
}
/** Inserts or updates in place. An older revision (late event after a newer reply) never overwrites a newer one. */
export function upsertMessage(list: ChatMessage[], message: ChatMessage, limit = chatLimits.memory) {
  const index = list.findIndex(x => x.id === message.id);
  if (index >= 0) {
    if ((list[index].revision ?? 0) > (message.revision ?? 0)) return list;
    const next = [...list]; next[index] = message;
    return refreshQuotes(next, message);
  }
  return refreshQuotes([...list, message].sort(order), message).slice(-limit);
}
/** Merges a history page (initial, reconnection or older page) keeping the newest revision of each message. */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[], limit = chatLimits.memory) {
  const byId = new Map(current.map(x => [x.id, x]));
  for (const message of incoming) {
    const known = byId.get(message.id);
    if (!known || (known.revision ?? 0) <= (message.revision ?? 0)) byId.set(message.id, message);
  }
  let merged = [...byId.values()].sort(order);
  for (const message of merged) if (message.deleted) merged = refreshQuotes(merged, message);
  return merged.length > limit ? merged.slice(-limit) : merged;
}
/** The oldest persisted message, used as the anchor for "load earlier" (system notices live only in memory). */
export function oldestPersisted(list: ChatMessage[]) {return list.find(x => x.kind !== 'system');}

export type ReactionSummary = {emoji: string; count: number; mine: boolean; names: string[]};
export function summarizeReactions(message: ChatMessage, me?: string): ReactionSummary[] {
  const groups = new Map<string, ReactionSummary>();
  for (const reaction of message.reactions ?? []) {
    const group = groups.get(reaction.emoji) ?? {emoji: reaction.emoji, count: 0, mine: false, names: []};
    group.count++; group.names.push(reaction.name); group.mine ||= reaction.accountId === me;
    groups.set(reaction.emoji, group);
  }
  return [...groups.values()];
}
export function myReaction(message: ChatMessage, me?: string) {return message.reactions?.find(x => x.accountId === me)?.emoji;}
export function canEdit(message: ChatMessage, me: string | undefined, now = Date.now()) {
  return !!me && message.senderId === me && message.kind !== 'system' && !message.deleted && now - Date.parse(message.at) <= chatLimits.editMinutes * 60000;
}
export function canDelete(message: ChatMessage, me: string | undefined, owner: boolean) {
  return !!me && message.kind !== 'system' && !message.deleted && (message.senderId === me || owner);
}

export type TypingMap = Record<string, {name: string; until: number}>;
export const typingTtl = 5000;
export function addTyping(map: TypingMap, event: {senderId: string; sender: string}, now = Date.now()): TypingMap {
  return {...pruneTyping(map, now), [event.senderId]: {name: event.sender, until: now + typingTtl}};
}
export function clearTyping(map: TypingMap, senderId: string): TypingMap {
  if (!map[senderId]) return map;
  const next = {...map}; delete next[senderId]; return next;
}
export function pruneTyping(map: TypingMap, now = Date.now()): TypingMap {
  const entries = Object.entries(map).filter(([, value]) => value.until > now);
  return entries.length === Object.keys(map).length ? map : Object.fromEntries(entries);
}
export function typingLabel(map: TypingMap, hidden: string[] = [], now = Date.now()) {
  const names = Object.entries(map).filter(([id, value]) => value.until > now && !hidden.includes(id)).map(([, value]) => value.name);
  if (!names.length) return '';
  if (names.length === 1) return `${names[0]} está escribiendo…`;
  if (names.length === 2) return `${names[0]} y ${names[1]} están escribiendo…`;
  return 'Varias personas están escribiendo…';
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0).replace('.', ',')} MB`;
}
export function formatDuration(ms?: number | null) {
  const total = Math.max(0, Math.round((ms ?? 0) / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
export function fileExtension(name: string) {
  const match = /\.([a-z0-9]{1,6})$/i.exec(name);
  return match ? match[1].toUpperCase() : 'ARCHIVO';
}
/** Short accessible description used by TalkBack and the reply bar. */
export function describeMessage(message: ChatMessage) {
  if (message.deleted) return deletedText;
  const parts = [message.text, ...(message.attachments ?? []).map(x => x.kind === 'image' ? 'Foto' : x.kind === 'audio' ? `Nota de voz de ${formatDuration(x.durationMs)}` : `Archivo ${x.name}`)];
  return parts.filter(Boolean).join('. ');
}

/** A file chosen on this device that has not been sent yet. `blob` exists only on web. */
export type LocalAttachment = {key: string; uri: string; name: string; mime: string; kind: 'image' | 'audio' | 'file'; size: number;
  durationMs?: number; width?: number; height?: number; temporary?: boolean; blob?: Blob};
export type UploadHandle = {promise: Promise<ChatAttachment>; cancel: () => void};
/** Upload failure carrying the HTTP status (0 when offline or cancelled). */
export class UploadError extends Error {constructor(message: string, readonly status: number) {super(message);}}
export const localKey = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
/** Spanish message for a failed attachment request (server problem detail when present). */
export function uploadError(status: number, body: string) {
  try {const detail = (JSON.parse(body) as {detail?: string}).detail; if (detail) return detail;} catch {/* not JSON */}
  if (status === 413) return 'El archivo supera 10 MB.';
  if (status === 429) return 'Subiste muchos archivos seguidos. Espera unos minutos.';
  if (status === 401 || status === 403) return 'Tu sesión o acceso a la sala ya no es válido.';
  return status ? 'No se pudo subir el archivo.' : 'Sin conexión. El borrador sigue aquí para reintentar.';
}

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
/** Separator label in the device's time zone: «Hoy», «Ayer» or the date. */
export function dayLabel(at: string, now = new Date()) {
  const date = new Date(at);
  if (dayKey(date) === dayKey(now)) return 'Hoy';
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (dayKey(date) === dayKey(yesterday)) return 'Ayer';
  return date.toLocaleDateString('es', {weekday: 'long', day: 'numeric', month: 'long', ...(date.getFullYear() !== now.getFullYear() ? {year: 'numeric'} : {})});
}
export const sameDay = (a: string, b: string) => dayKey(new Date(a)) === dayKey(new Date(b));
/** Consecutive messages from the same person within 3 minutes share one header, like WhatsApp. */
export function continuesGroup(previous: ChatMessage | undefined, message: ChatMessage) {
  return !!previous && previous.kind !== 'system' && message.kind !== 'system' && previous.senderId === message.senderId
    && sameDay(previous.at, message.at) && Date.parse(message.at) - Date.parse(previous.at) < 3 * 60000;
}
/** Splits text into plain and https-link parts; only https links become tappable. */
export function linkParts(text: string): {text: string; url?: string}[] {
  const parts: {text: string; url?: string}[] = [];
  const pattern = /https:\/\/[^\s<>"]+[^\s<>".,;:!?)\]]/gi;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > last) parts.push({text: text.slice(last, match.index)});
    parts.push({text: match[0], url: match[0]});
    last = match.index! + match[0].length;
  }
  if (last < text.length) parts.push({text: text.slice(last)});
  return parts;
}

let emojiPattern: {only: RegExp; each: RegExp} | null | undefined;
function emojiRegex() {
  if (emojiPattern !== undefined) return emojiPattern;
  try {emojiPattern = {only: new RegExp(String.raw`^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\u200d|\ufe0f|\s)+$`, 'u'), each: new RegExp(String.raw`\p{Extended_Pictographic}`, 'gu')};}
  catch {emojiPattern = null;}
  return emojiPattern;
}
/** One to three emojis and nothing else are shown big, like stickers. */
export function isJumboEmoji(text: string) {
  const pattern = emojiRegex(); const value = text.trim();
  if (!pattern || !value || !pattern.only.test(value)) return false;
  const count = value.match(pattern.each)?.length ?? 0;
  return count >= 1 && count <= 3;
}
/** Emoji and «sticker» panel of the composer (Rave-style chat: no photos or files). */
export const emojiPanel = ['😂', '😍', '🥰', '😎', '🤩', '😭', '😱', '🤯', '🥳', '😴', '🤔', '🙄', '😅', '😉', '🤗', '🫶',
  '❤️', '🔥', '👏', '🙌', '💯', '✨', '🎉', '🎶', '🎧', '🍿', '🎬', '📺', '👀', '💀', '👍', '👎', '🙏', '💃', '🕺', '🤣'];
