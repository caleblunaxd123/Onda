import {useCallback, useEffect, useRef, useState} from 'react';
import {FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, Share, TextInput, View} from 'react-native';
import {router, useLocalSearchParams, useFocusEffect, useIsFocused} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {Ionicons} from '../../icons';
import {useLibrary} from '../../library';
import {usePlayer} from '../../player';
import {Artwork, Button, Card, Chip, EmptyState, IconButton, Label, Loading, Muted, Page, ScreenHeader, Sheet, ActionRow} from '../../ui';
import {FormField} from '../../components/forms';
import {accountRequest, ensureListener, useAuth} from '../account/session';
import {enterRoom, leaveRoom, muteMember, refreshRoom, roomCommand, toggleRoomAudio, useRoom} from './client';
import {MediaFrame, type MediaEvent} from './media-frame';
import {SourcePicker} from './source-picker';
import {mediaLabel, playbackPosition, type MediaInput, type Member, type Room} from './types';

const durationLabel = (value: number) => `${Math.floor(Math.max(0, value) / 60)}:${String(Math.floor(Math.max(0, value)) % 60).padStart(2, '0')}`;
export default function RoomScreen() {
  const c = useTheme(); const auth = useAuth(); const state = useRoom();
  const library = useLibrary(); const nativePlayback = usePlayer();
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{id?: string; code?: string}>();
  const id = typeof params.id === 'string' ? params.id : ''; const code = typeof params.code === 'string' ? params.code : '';
  const [name, setName] = useState(''); const [bootError, setBootError] = useState(''); const [joining, setJoining] = useState(false); const [retry, setRetry] = useState(0);
  const [tab, setTab] = useState<'chat' | 'queue' | 'people'>('chat'); const [text, setText] = useState('');
  const [actionError, setActionError] = useState(''); const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<'add' | 'invite' | 'report' | 'close' | null>(null); const [member, setMember] = useState<Member | null>(null);
  const [input, setInput] = useState<MediaInput>({kind: 'video'}); const [reason, setReason] = useState('');
  const [mediaFailure, setMediaFailure] = useState({source: '', message: ''}); const [tapSource, setTapSource] = useState('');
  const [mediaProgress, setMediaProgress] = useState({source: '', position: 0, duration: 0}); const positionRef = useRef(0);
  const [timelineNow, setTimelineNow] = useState(() => Date.now());
  const room = state.room; const host = room?.ownerId === auth.session?.user.id;
  const source = room?.media.url ?? '';
  const mediaError = mediaFailure.source === source ? mediaFailure.message : '';
  const tapRequired = tapSource === source && !!source;
  const progress = mediaProgress.source === source ? mediaProgress : {position: 0, duration: 0};
  const ready = state.status === 'connected';
  const sessionId = auth.session?.user.id; const sessionToken = auth.session?.token;
  useFocusEffect(useCallback(() => {
    if (!auth.ready || !sessionToken) return;
    let cancelled = false;
    const start = async () => {
      if (retry > 0) setActionError('');
      setBootError(''); setJoining(true);
      try {
        let target = id; let inviteCode = code;
        if (!target && code) {const resolved = await accountRequest<Room>('/api/v1/rooms/invite/' + encodeURIComponent(code)); target = resolved.id; inviteCode = resolved.inviteCode ?? code;}
        if (!target) throw new Error('Pide un enlace o código de invitación válido.');
        if (!cancelled) await enterRoom(target, inviteCode);
      } catch (e) {if (!cancelled) setBootError(e instanceof Error ? e.message : 'No se pudo entrar.');}
      finally {if (!cancelled) setJoining(false);}
    };
    void start(); return () => {cancelled = true; void leaveRoom();};
  }, [auth.ready, sessionToken, id, code, retry]));
  useEffect(() => {const timer = setInterval(() => setTimelineNow(Date.now()), 10000); return () => clearInterval(timer);}, []);
  const desiredPosition = room ? playbackPosition(room, timelineNow, state.clockOffset) : 0;
  const act = async (method: string, ...args: unknown[]) => {
    setBusy(true); setActionError('');
    try {await roomCommand(method, ...args); return true;}
    catch (e) {setActionError(e instanceof Error ? e.message : 'No se pudo completar.'); return false;}
    finally {setBusy(false);}
  };
  const playback = (playing: boolean, position: number) => {
    const latest = useRoom.getState().room; if (!latest) return;
    return act('SetPlayback', latest.id, {playing, positionSeconds: Number.isFinite(position) ? Math.max(0, Math.min(86400, position)) : 0, version: latest.version});
  };
  const mediaEvent = (event: MediaEvent) => {
    if (event.kind === 'ready') {positionRef.current = 0; setMediaProgress({source, position: 0, duration: 0});}
    if (event.kind === 'error') setMediaFailure({source, message: room?.media.kind === 'youtube' ? 'Este video no pudo reproducirse aquí. Puede estar restringido; abre la fuente o elige otro.' : 'No se pudo reproducir este archivo. Prueba otro enlace o formato.'});
    if (event.kind === 'tap') setTapSource(source);
    if (event.kind === 'progress') {positionRef.current = event.position ?? 0; setMediaProgress({source, position: event.position ?? 0, duration: Number.isFinite(event.duration) ? event.duration! : 0});}
    if (event.kind === 'control' && host && ready && !busy) void playback(event.playing ?? false, event.position ?? 0);
    if (event.kind === 'ended' && host && room?.queue[0] && ready) void act('PlayQueued', room.id, [...room.queue].sort((a, b) => b.votes - a.votes)[0].id);
  };
  const send = async () => {if (!room || !text.trim()) return; if (await act('SendMessage', room.id, text.trim())) setText('');};
  const share = () => {if (room?.inviteCode) void Share.share({message: `Ven a ${room.name} en ONDA: https://onda.lunalav.pe/room?code=${room.inviteCode}\nCódigo: ${room.inviteCode}`}).catch(() => {});};
  const report = async () => {
    if (!room) return; setBusy(true); setActionError('');
    try {await accountRequest('/api/v1/rooms/' + room.id + '/reports', {method: 'POST', body: {accountId: member?.id ?? null, reason}}); setSheet(null); setReason(''); setMember(null); setActionError('Reporte recibido. Gracias por ayudar a cuidar la sala.');}
    catch (e) {setActionError(e instanceof Error ? e.message : 'No se pudo enviar el reporte.');} finally {setBusy(false);}
  };
  if (!focused) return <View style={{flex: 1, backgroundColor: c.bg}}/>;
  if (!auth.ready) return <Loading/>;
  if (!auth.session) return <View style={{flex: 1, backgroundColor: c.bg}}><ScreenHeader title="Te están esperando" back/><Page><Card><Label style={{fontWeight: '900', fontSize: 24}}>Un buen momento empieza juntos.</Label><Muted>Elige un nombre y entra. Puedes guardar una cuenta después.</Muted><FormField label="Tu nombre" value={name} onChange={setName} placeholder="Cómo te verán en la sala" maxLength={40}/><Button title={joining ? 'Entrando…' : 'Entrar como invitado'} disabled={joining} onPress={() => {setJoining(true); setBootError(''); void ensureListener(name).catch(e => setBootError(e.message)).finally(() => setJoining(false));}}/>{bootError && <Label accessibilityRole="alert" style={{color: c.live}}>{bootError}</Label>}<Button title="Ya tengo cuenta" secondary onPress={() => router.push('/account')}/></Card></Page></View>;
  if (!room) return <View style={{flex: 1, backgroundColor: c.bg}}><ScreenHeader title="Entrar a la sala" back/><Page>{joining || state.status === 'connecting' ? <Loading/> : <><EmptyState icon="people-outline" title="No pudimos entrar todavía" body={bootError || state.error || 'Comprueba la invitación y tu conexión.'}/><Button title="Volver a intentar" onPress={() => setRetry(x => x + 1)}/></>}</Page></View>;
  const messages = state.messages.filter(x => !state.muted.includes(x.senderId));
  const owner = room.members.find(x => x.id === room.ownerId);
  const queue = [...room.queue].sort((a, b) => b.votes - a.votes);
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1, backgroundColor: c.bg, paddingBottom: insets.bottom}}>
    <ScreenHeader title={room.name} subtitle={`${room.members.length} ${room.members.length === 1 ? 'persona' : 'personas'} · ${room.isPrivate ? 'Privada' : 'Pública'}`} back><IconButton icon={room.media.station ? library.favorites.some(x => x.id === room.media.station!.id) ? 'heart' : 'heart-outline' : library.mediaFavorites.some(x => x.media.url === room.media.url) ? 'bookmark' : 'bookmark-outline'} label="Guardar o quitar contenido" onPress={() => room.media.station ? library.toggle(room.media.station) : library.toggleMedia(room.media)}/><IconButton icon="link-outline" label="Invitar amigos" onPress={() => setSheet('invite')}/></ScreenHeader>
    <View style={{paddingHorizontal: 16, gap: 9, paddingTop: 8}}>
      {room.media.kind === 'radio' && room.media.station ? <Card style={{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14}}><Artwork station={room.media.station} size={64}/><View style={{flex: 1}}><Label numberOfLines={2} style={{fontWeight: '800', fontSize: 17}}>{room.media.title}</Label><Muted>{room.media.station.country} · {state.audioMuted ? 'Tu audio está silenciado' : !room.isPlaying ? 'En pausa' : nativePlayback.station?.id === room.media.station.id && nativePlayback.state === 'playing' ? 'En vivo' : nativePlayback.state === 'error' ? 'No se pudo reproducir' : 'Conectando…'}</Muted></View></Card> : <MediaFrame media={room.media} host={host} playing={ready && room.isPlaying} position={desiredPosition} muted={state.audioMuted} onEvent={mediaEvent}/>}
      {mediaError ? <Muted accessibilityRole="alert">{mediaError}</Muted> : tapRequired ? <Muted>Toca el reproductor para comenzar.</Muted> : null}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
        {host ? <IconButton icon={room.isPlaying ? 'pause' : 'play'} label={room.isPlaying ? 'Pausar para todos' : 'Reproducir para todos'} onPress={() => void playback(!room.isPlaying, room.media.kind === 'radio' ? 0 : positionRef.current || desiredPosition)} disabled={!ready || busy}/> : <Chip label={owner ? `${owner.name} lleva el control` : 'Esperando al anfitrión'} icon="person-outline"/>}
        {host && room.media.kind !== 'radio' && <><IconButton icon="play-back-outline" label="Retroceder 15 segundos" disabled={!ready || busy} onPress={() => void playback(room.isPlaying, Math.max(0, positionRef.current - 15))}/><IconButton icon="play-forward-outline" label="Avanzar 15 segundos" disabled={!ready || busy} onPress={() => void playback(room.isPlaying, progress.duration ? Math.min(progress.duration, positionRef.current + 15) : positionRef.current + 15)}/></>}
        <IconButton icon={state.audioMuted ? 'volume-mute-outline' : 'volume-high-outline'} label={state.audioMuted ? 'Activar mi audio' : 'Silenciar mi audio'} onPress={toggleRoomAudio}/>
        <IconButton icon="sync-outline" label="Volver a sincronizar" disabled={!ready} onPress={() => {setTimelineNow(Date.now()); void refreshRoom().catch(e => setActionError(e.message));}}/>
        <View style={{flex: 1}}><Muted>{room.media.kind !== 'radio' ? `${durationLabel(progress.position)}${progress.duration ? ` / ${durationLabel(progress.duration)}` : ''}` : mediaLabel[room.media.kind]}</Muted><Muted style={{fontSize: 11, color: ready ? c.primaryText : c.live}}>{ready ? 'Conectados' : state.status === 'reconnecting' ? 'Reconectando…' : 'Sala desconectada'}</Muted></View>
        {state.reaction && <Label style={{fontSize: 27}}>{state.reaction}</Label>}
      </View>
      {(actionError || state.error) && <Muted accessibilityRole="alert">{actionError || state.error}</Muted>}
      {state.status === 'closed' && <Button title="Volver a entrar" onPress={() => setRetry(x => x + 1)}/>}
      <View style={{flexDirection: 'row', gap: 7, paddingBottom: 4}}><Chip label="Chat" selected={tab === 'chat'} onPress={() => setTab('chat')}/><Chip label={`Siguiente · ${queue.length}`} selected={tab === 'queue'} onPress={() => setTab('queue')}/><Chip label="Personas" selected={tab === 'people'} onPress={() => setTab('people')}/></View>
    </View>
    {tab === 'chat' ? <>
      <FlatList data={messages} keyExtractor={item => item.id} contentContainerStyle={{padding: 16, gap: 10, flexGrow: 1}} ListEmptyComponent={<Muted style={{textAlign: 'center', padding: 20}}>Saluda a tu gente. El chat vive durante esta sesión.</Muted>}
        renderItem={({item}) => <Pressable accessibilityRole="button" accessibilityLabel={`Mensaje de ${item.sender}: ${item.text}. Opciones`} onPress={() => setMember({id: item.senderId, name: item.sender})} style={{alignSelf: item.senderId === sessionId ? 'flex-end' : 'flex-start', maxWidth: '90%', padding: 12, gap: 4, borderRadius: 16, backgroundColor: item.senderId === sessionId ? c.accentSoft : c.surface}}><Label style={{fontSize: 11, fontWeight: '800', color: c.primaryText}}>{item.sender}</Label><Label>{item.text}</Label></Pressable>}/>
      <View style={{paddingHorizontal: 16, gap: 6, paddingBottom: 10}}><View style={{flexDirection: 'row', gap: 10}}>{['❤️', '🔥', '👏', '😂', '🎵'].map(emoji => <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`Reaccionar ${emoji}`} disabled={!ready} onPress={() => void act('React', room.id, emoji)} style={{minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center'}}><Label style={{fontSize: 24}}>{emoji}</Label></Pressable>)}</View><View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}><TextInput accessibilityLabel="Mensaje para la sala" value={text} onChangeText={setText} placeholder="Escribe algo…" placeholderTextColor={c.muted} maxLength={300} multiline style={{flex: 1, minHeight: 46, maxHeight: 100, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 12, backgroundColor: c.surface, color: c.text}}/><IconButton icon="send" label="Enviar mensaje" disabled={!ready || busy || !text.trim()} onPress={() => void send()}/></View></View>
    </> : tab === 'queue' ? <FlatList data={queue} keyExtractor={item => item.id} contentContainerStyle={{padding: 16, gap: 12}} ListHeaderComponent={<Button title="Proponer contenido" icon="add" disabled={!ready} onPress={() => {setInput({kind: 'video'}); setSheet('add');}}/>} ListEmptyComponent={<Muted style={{padding: 20, textAlign: 'center'}}>Propón algo para seguir disfrutando. Cada persona puede votar.</Muted>}
      renderItem={({item}) => <Card style={{padding: 14}}><Label numberOfLines={2} style={{fontWeight: '800'}}>{item.media.title}</Label><Muted>{mediaLabel[item.media.kind]} · {item.votes} {item.votes === 1 ? 'voto' : 'votos'}</Muted><View style={{flexDirection: 'row', gap: 8}}><Chip label="Votar" icon="thumbs-up-outline" onPress={() => void act('Vote', room.id, item.id)}/>{host && <><Chip label="Reproducir" icon="play" onPress={() => void act('PlayQueued', room.id, item.id)}/><IconButton icon="trash-outline" label="Retirar propuesta" onPress={() => void act('RemoveQueued', room.id, item.id)}/></>}</View></Card>}/> : <FlatList data={room.members} keyExtractor={item => item.id} contentContainerStyle={{padding: 16, gap: 12}} ListFooterComponent={<View style={{gap: 10, paddingVertical: 14}}><Button title="Reportar sala" secondary icon="flag-outline" onPress={() => {setMember(null); setSheet('report');}}/>{host && <Button title="Cerrar sala para todos" secondary onPress={() => setSheet('close')}/>}<Button title="Salir de la sala" secondary icon="log-out-outline" onPress={() => router.canGoBack() ? router.back() : router.replace('/rooms')}/></View>}
      renderItem={({item}) => <Pressable accessibilityRole="button" accessibilityLabel={`Opciones de ${item.name}`} onPress={() => setMember(item)} style={{flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, backgroundColor: c.surface, borderRadius: 18}}><Ionicons name="person-circle-outline" size={32} color={c.primaryText}/><View style={{flex: 1}}><Label style={{fontWeight: '700'}}>{item.name}{item.id === sessionId ? ' · Tú' : ''}</Label><Muted>{item.id === room.ownerId ? 'Anfitrión' : state.muted.includes(item.id) ? 'Silenciado para ti' : 'En la sala'}</Muted></View><Ionicons name="ellipsis-horizontal" size={20} color={c.muted}/></Pressable>}/>
    }
    {sheet === 'invite' && <Sheet title="Invita a tu gente" onClose={() => setSheet(null)}><Muted>{room.isPrivate ? 'Quien reciba este código podrá entrar a la sala privada.' : 'Comparte el enlace para entrar directamente.'}</Muted><Label selectable style={{fontSize: 26, letterSpacing: 3, fontWeight: '900', textAlign: 'center', paddingVertical: 18}}>{room.inviteCode}</Label><Button title="Compartir invitación" icon="share-social-outline" onPress={share}/>{host && <><Muted>Renovar el código invalida las invitaciones anteriores. Las personas que ya están conectadas permanecen en la sala.</Muted><Button title="Renovar código de invitación" secondary disabled={busy} onPress={() => void act('RotateInvite', room.id)}/></>}</Sheet>}
    {sheet === 'add' && <Sheet title="Qué compartimos después" onClose={() => setSheet(null)}><SourcePicker value={input} onChange={setInput}/>{actionError && <Muted>{actionError}</Muted>}<Button title={busy ? 'Añadiendo…' : 'Proponer a la sala'} disabled={busy || input.kind === 'radio' && !input.stationId || input.kind !== 'radio' && !input.url?.trim()} onPress={() => {void act('AddToQueue', room.id, input).then(ok => {if (ok) {setSheet(null); setTab('queue');}});}}/></Sheet>}
    {member && !sheet && <Sheet title={member.name} onClose={() => setMember(null)}>{member.id !== sessionId && <><ActionRow icon="volume-mute-outline" label={state.muted.includes(member.id) ? 'Volver a mostrar sus mensajes' : 'Silenciar sus mensajes para mí'} onPress={() => {muteMember(member.id); setMember(null);}}/><ActionRow icon="flag-outline" label="Reportar a esta persona" onPress={() => {setReason(''); setSheet('report');}}/>{host && <><ActionRow icon="star-outline" label="Pasarle el control de la sala" onPress={() => {void act('TransferHost', room.id, member.id).then(ok => {if (ok) setMember(null);});}}/><ActionRow icon="remove-circle-outline" label="Expulsar de esta sala" onPress={() => {void act('Kick', room.id, member.id).then(ok => {if (ok) setMember(null);});}}/></>}</>}{room.media.url && <ActionRow icon="open-outline" label="Abrir fuente del contenido" onPress={() => {void Linking.openURL(room.media.url!); setMember(null);}}/>}</Sheet>}
    {sheet === 'report' && <Sheet title={member ? `Reportar a ${member.name}` : 'Reportar sala'} onClose={() => {setSheet(null); setMember(null);}}><FormField label="Qué ocurrió" value={reason} onChange={setReason} maxLength={500} multiline/>{actionError && <Muted>{actionError}</Muted>}<Button title={busy ? 'Enviando…' : 'Enviar reporte'} disabled={busy || reason.trim().length < 3} onPress={() => void report()}/></Sheet>}
    {sheet === 'close' && <Sheet title="Cerrar sala" onClose={() => setSheet(null)}><Muted>Todos saldrán de esta sala. Si quieres que continúe, pasa el control a otra persona antes de salir.</Muted><Button title="Cerrar para todos" onPress={() => {void act('CloseRoom', room.id).then(ok => {if (ok) router.replace('/rooms');});}}/></Sheet>}
  </KeyboardAvoidingView>;
}
