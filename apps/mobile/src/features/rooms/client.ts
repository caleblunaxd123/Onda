import {HubConnectionBuilder, HubConnectionState, HttpTransportType, LogLevel, type HubConnection} from '@microsoft/signalr';
import {create} from 'zustand';
import {apiBase} from '../../api';
import {isActive, player} from '../../player';
import {useAuth} from '../account/session';
import type {ChatMessage, Room} from './types';

type RoomState = {room: Room | null; messages: ChatMessage[]; status: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed'; error: string; reaction: string; clockOffset: number; muted: string[]; audioMuted: boolean};
export const useRoom = create<RoomState>(() => ({room: null, messages: [], status: 'idle', error: '', reaction: '', clockOffset: 0, muted: [], audioMuted: false}));
let connection: HubConnection | null = null;
let generation = 0;
let joinedCode: string | null = null;
let lastRadio: string | undefined;
const pauseAudio = () => {if (isActive(player.getSnapshot().state)) player.toggle();};
function applyRoom(room: Room) {
  if (useRoom.getState().room && useRoom.getState().room?.id !== room.id) return;
  const old = useRoom.getState().room?.media;
  useRoom.setState({room});
  if (room.media.kind === 'radio' && room.media.station) {
    if (room.isPlaying && useRoom.getState().status === 'connected' && !useRoom.getState().audioMuted) {
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
  useRoom.setState({room: null, messages: [], status: 'idle', error: '', reaction: '', audioMuted: false});
  if (old) await old.stop().catch(() => {});
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
    useRoom.setState({clockOffset: Date.parse(room.serverNow) - (before + Date.now()) / 2, status: 'connected'});
    applyRoom(room);
    const messages = await hub.invoke<ChatMessage[]>('History', id);
    if (valid()) useRoom.setState({messages: messages.slice(-100)});
  };
  hub.on('State', (room: Room) => {if (valid()) applyRoom(room);});
  hub.on('Message', (message: ChatMessage) => {if (valid()) useRoom.setState(s => ({messages: [...s.messages.filter(x => x.id !== message.id), message].slice(-100)}));});
  hub.on('Reaction', (event: {senderId: string; emoji: string}) => {
    if (!valid() || useRoom.getState().muted.includes(event.senderId)) return;
    useRoom.setState({reaction: event.emoji}); setTimeout(() => {if (valid()) useRoom.setState({reaction: ''});}, 2000);
  });
  const closed = (roomId: string) => {
    if (!valid() || roomId !== id) return;
    pauseAudio(); useRoom.setState({status: 'closed', error: 'La sala se cerró o tu acceso fue retirado.'}); void hub.stop();
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
  try {return await connection.invoke(method, ...args);}
  catch (error) {throw new Error(error instanceof Error ? error.message.replace(/^.*HubException:\s*/, '') : 'No se pudo completar.');}
}
export async function refreshRoom() {
  const room = useRoom.getState().room; if (!room) return;
  const before = Date.now(); const snapshot = await roomCommand('Snapshot', room.id) as Room;
  useRoom.setState({clockOffset: Date.parse(snapshot.serverNow) - (before + Date.now()) / 2}); applyRoom(snapshot);
}
export function muteMember(id: string) {useRoom.setState(s => ({muted: s.muted.includes(id) ? s.muted.filter(x => x !== id) : [...s.muted, id].slice(-200)}));}
export function toggleRoomAudio() {useRoom.setState(s => ({audioMuted: !s.audioMuted})); const room = useRoom.getState().room; if (room) applyRoom(room);}
useAuth.subscribe((state, previous) => {if (state.session?.token !== previous.session?.token && connection) void leaveRoom();});
