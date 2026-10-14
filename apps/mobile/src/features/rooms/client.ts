import {HubConnectionBuilder, HubConnectionState, HttpTransportType, LogLevel, type HubConnection} from '@microsoft/signalr';
import {create} from 'zustand';
import {apiBase} from '../../api';
import {isActive, player} from '../../player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createJSONStorage, persist} from 'zustand/middleware';
import {useAuth} from '../account/session';
import {addTyping, chatLimits, clearTyping, mergeMessages, oldestPersisted, upsertMessage, type TypingMap} from './chat';
import {estimateClock, type ClockSample} from './sync-engine';
import type {ChatMessage, Room} from './types';

type RoomState = {room: Room | null; messages: ChatMessage[]; status: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed'; error: string; reaction: string; clockOffset: number; muted: string[]; audioMuted: boolean; votes: string[];
  /** Typing signals from others; each expires on its own after a few seconds. */
  typing: TypingMap; olderAvailable: boolean; loadingOlder: boolean;
  /** Recording or listening to a voice note pauses only this device's room audio; nothing is published to the room. */
  chatAudio: boolean;
  /** Last measured round trip to the server (ms), shown when sync quality matters. */
  latencyMs: number | null};
export const useRoom = create<RoomState>(() => ({room: null, messages: [], status: 'idle', error: '', reaction: '', clockOffset: 0, muted: [], audioMuted: false, votes: [],
  typing: {}, olderAvailable: false, loadingOlder: false, chatAudio: false, latencyMs: null}));
/** "Delete for me" is local to this device: the message stays for everyone else. */
export const useHiddenMessages = create<{ids: string[]; hide: (id: string) => void}>()(persist(set => ({
  ids: [], hide: id => set(s => ({ids: [...s.ids.filter(x => x !== id), id].slice(-1000)})),
}), {name: 'onda-chat-hidden-v1', storage: createJSONStorage(() => AsyncStorage)}));
let connection: HubConnection | null = null;
let generation = 0;
let joinedCode: string | null = null;
let lastRadio: string | undefined;
const pauseAudio = () => {if (isActive(player.getSnapshot().state)) player.toggle();};
function applyRoom(room: Room) {
  if (useRoom.getState().room && useRoom.getState().room?.id !== room.id) return;
  const old = useRoom.getState().room?.media;
  useRoom.setState(state => ({room, votes: state.votes.filter(id => room.queue.some(x => x.id === id))}));
  if (room.media.kind === 'radio' && room.media.station) {
    const local = useRoom.getState();
    if (room.isPlaying && local.status === 'connected' && !local.audioMuted && !local.chatAudio) {
      const current = player.getSnapshot();
      if (current.station?.id !== room.media.station.id) player.select(room.media.station, {stations: [room.media.station], title: room.name});
      else if (!isActive(current.state)) player.toggle();
    } else if (player.getSnapshot().station?.id === room.media.station.id) pauseAudio();
    lastRadio = room.media.station.id;
  } else if (old?.kind === 'radio') pauseAudio();
}
export async function leaveRoom() {
  generation++; const old = connection; connection = null; joinedCode = null;
  if (player.getSnapshot().station?.id === lastRadio) pauseAudio(); lastRadio = undefined;
  useRoom.setState({room: null, messages: [], status: 'idle', error: '', reaction: '', audioMuted: false, votes: [], typing: {}, olderAvailable: false, loadingOlder: false, chatAudio: false, latencyMs: null});
  if (old) await old.stop().catch(() => {});
}
/**
 * NTP-style clock sampling against the server (ServerTime): keeps the lowest round trip, whose error is bounded
 * by half of it. Older servers without the method keep the offset estimated from Join/Snapshot.
 */
async function sampleClock(hub: HubConnection, valid: () => boolean) {
  const samples: ClockSample[] = [];
  for (let i = 0; i < 5 && valid(); i++) {
    const sentMs = Date.now();
    try {const serverMs = await hub.invoke<number>('ServerTime'); samples.push({sentMs, serverMs, receivedMs: Date.now()});}
    catch {return;}
  }
  const clock = estimateClock(samples);
  if (clock && valid()) useRoom.setState({clockOffset: clock.offsetMs, latencyMs: clock.rttMs});
}
export async function enterRoom(id: string, code?: string | null) {
  const expected = generation + 1;
  await leaveRoom(); if (generation !== expected) return; const current = generation;
  const session = useAuth.getState().session;
  if (!session) throw new Error('Elige un nombre para entrar.');
  pauseAudio(); joinedCode = code ?? null;
  useRoom.setState({status: 'connecting', error: ''});
  const hub = new HubConnectionBuilder().withUrl(apiBase + '/hubs/rooms', {transport: HttpTransportType.WebSockets, skipNegotiation: true,
    accessTokenFactory: () => useAuth.getState().session?.token ?? '', withCredentials: false})
    .withAutomaticReconnect([0, 2000, 5000, 10000]).configureLogging(LogLevel.None).build();
  connection = hub;
  const valid = () => connection === hub && generation === current;
  const join = async () => {
    const before = Date.now(); const room = await hub.invoke<Room>('Join', id, joinedCode);
    if (!valid()) return;
    // Coarse estimate until the sampled one (sampleClock) is available.
    useRoom.setState(state => ({clockOffset: state.latencyMs === null ? Date.parse(room.serverNow) - (before + Date.now()) / 2 : state.clockOffset, status: 'connected'}));
    applyRoom(room);
    void sampleClock(hub, valid);
    const history = await hub.invoke<ChatMessage[]>('History', id);
    if (valid()) useRoom.setState(s => {
      const persisted = history.filter(x => x.kind !== 'system');
      const newest = [...s.messages].reverse().find(x => x.kind !== 'system');
      // After a long disconnection the fresh page may not touch what we had: start again instead of leaving a silent gap.
      const gap = !!newest && persisted.length >= 100 && Date.parse(persisted[0].at) > Date.parse(newest.at);
      return {messages: gap ? history : mergeMessages(s.messages, history, chatLimits.memory),
        olderAvailable: gap || !s.messages.length ? persisted.length >= 100 : s.olderAvailable};
    });
    const votes = await hub.invoke<string[]>('MyVotes', id);
    if (valid()) useRoom.setState({votes});
  };
  hub.on('State', (room: Room) => {if (valid()) applyRoom(room);});
  const resample = setInterval(() => {if (!valid()) clearInterval(resample); else if (hub.state === HubConnectionState.Connected) void sampleClock(hub, valid);}, 60000);
  hub.on('Message', (message: ChatMessage) => {if (valid()) useRoom.setState(s => ({messages: upsertMessage(s.messages, message), typing: clearTyping(s.typing, message.senderId)}));});
  hub.on('MessageUpdated', (message: ChatMessage) => {if (valid()) useRoom.setState(s => ({messages: upsertMessage(s.messages, message)}));});
  hub.on('Typing', (event: {senderId: string; sender: string}) => {
    if (!valid() || useRoom.getState().muted.includes(event.senderId)) return;
    useRoom.setState(s => ({typing: addTyping(s.typing, event)}));
  });
  hub.on('Reaction', (event: {senderId: string; emoji: string}) => {
    if (!valid() || useRoom.getState().muted.includes(event.senderId)) return;
    useRoom.setState({reaction: event.emoji}); setTimeout(() => {if (valid()) useRoom.setState({reaction: ''});}, 2000);
  });
  const closed = (roomId: string) => {
    if (!valid() || roomId !== id) return;
    pauseAudio(); useRoom.setState({status: 'closed', error: 'La sala se cerró o tu acceso fue retirado.'});
  };
  hub.on('Closed', closed); hub.on('Kicked', closed);
  hub.on('Refresh', () => {if (valid()) void refreshRoom().catch(() => {});});
  hub.onreconnecting(() => {if (valid()) {pauseAudio(); useRoom.setState({status: 'reconnecting', error: ''});}});
  hub.onreconnected(() => {if (valid()) void join().catch(() => useRoom.setState({status: 'closed', error: 'No se pudo volver a entrar. Comprueba la invitación.'}));});
  hub.onclose(() => {if (valid()) {pauseAudio(); useRoom.setState(s => ({status: 'closed', error: s.error || 'Se perdió la conexión. Puedes volver a entrar.'}));}});
  try {await hub.start(); if (!valid()) {await hub.stop(); return;} await join();}
  catch {if (valid()) {await hub.stop().catch(() => {}); useRoom.setState({status: 'closed', error: 'No se pudo entrar. Comprueba la conexión y la invitación.'});}}
}
export async function roomCommand(method: string, ...args: unknown[]) {
  if (!connection || connection.state !== HubConnectionState.Connected || useRoom.getState().status !== 'connected') throw new Error('Espera a que la sala vuelva a conectarse.');
  try {
    const result = await connection.invoke(method, ...args);
    if (method === 'Vote' && typeof result === 'boolean') useRoom.setState(state => ({votes: result ? [...new Set([...state.votes, String(args[1])])] : state.votes.filter(x => x !== args[1])}));
    return result;
  }
  catch (error) {throw new Error(error instanceof Error ? error.message.replace(/^.*HubException:\s*/, '') : 'No se pudo completar.');}
}
export async function refreshRoom() {
  const room = useRoom.getState().room; if (!room) return;
  const before = Date.now(); const snapshot = await roomCommand('Snapshot', room.id) as Room;
  if (useRoom.getState().latencyMs === null) useRoom.setState({clockOffset: Date.parse(snapshot.serverNow) - (before + Date.now()) / 2});
  applyRoom(snapshot);
}
export function muteMember(id: string) {useRoom.setState(s => ({muted: s.muted.includes(id) ? s.muted.filter(x => x !== id) : [...s.muted, id].slice(-200)}));}
export function toggleRoomAudio() {useRoom.setState(s => ({audioMuted: !s.audioMuted})); const room = useRoom.getState().room; if (room) applyRoom(room);}
/** Pauses/resumes only this device's room audio while a voice note records or plays. */
export function setChatAudio(active: boolean) {
  if (useRoom.getState().chatAudio === active) return;
  useRoom.setState({chatAudio: active}); const room = useRoom.getState().room; if (room) applyRoom(room);
}
export type ChatDraft = {text?: string; replyToId?: string | null; attachmentIds?: string[]};
const keep = (message: ChatMessage) => {useRoom.setState(s => ({messages: upsertMessage(s.messages, message)})); return message;};
const currentRoom = () => {const room = useRoom.getState().room; if (!room) throw new Error('Espera a que la sala vuelva a conectarse.'); return room.id;};
export async function sendChat(draft: ChatDraft) {
  return keep(await roomCommand('SendChat', currentRoom(), {text: draft.text ?? null, replyToId: draft.replyToId ?? null, attachmentIds: draft.attachmentIds ?? []}) as ChatMessage);
}
export async function editChat(messageId: string, text: string) {return keep(await roomCommand('EditChat', currentRoom(), {messageId, text}) as ChatMessage);}
export async function deleteChat(messageId: string) {return keep(await roomCommand('DeleteChat', currentRoom(), {messageId}) as ChatMessage);}
export async function reactChat(messageId: string, emoji: string) {return keep(await roomCommand('ReactChat', currentRoom(), {messageId, emoji}) as ChatMessage);}
let lastTyping = 0;
/** Throttled, fire-and-forget: a lost typing signal is harmless and never blocks writing. */
export function notifyTyping() {
  const room = useRoom.getState().room; const now = Date.now();
  if (!room || !connection || connection.state !== HubConnectionState.Connected || now - lastTyping < 3000) return;
  lastTyping = now; void connection.send('Typing', room.id).catch(() => {});
}
export async function loadOlderMessages() {
  const state = useRoom.getState(); const anchor = oldestPersisted(state.messages);
  if (!state.room || state.loadingOlder || !state.olderAvailable) return;
  if (!anchor) {useRoom.setState({olderAvailable: false}); return;}
  useRoom.setState({loadingOlder: true});
  try {
    const page = await roomCommand('ChatHistory', state.room.id, anchor.id) as {items: ChatMessage[]; hasMore: boolean};
    useRoom.setState(s => ({messages: mergeMessages(s.messages, page.items, chatLimits.memory), olderAvailable: page.hasMore}));
  } finally {useRoom.setState({loadingOlder: false});}
}
useAuth.subscribe((state, previous) => {if (state.session?.token !== previous.session?.token && connection) void leaveRoom();});
