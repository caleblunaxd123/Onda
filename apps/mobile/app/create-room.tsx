import {useState} from 'react';
import {Keyboard, View} from 'react-native';
import {router, useLocalSearchParams} from 'expo-router';
import {useTheme} from '../src/theme';
import {player} from '../src/player';
import {useLibrary} from '../src/library';
import {Button, Card, Chip, Label, Muted, Page, ScreenHeader} from '../src/ui';
import {FormField} from '../src/components/forms';
import {accountRequest, ensureListener, useAuth} from '../src/features/account/session';
import {SourcePicker} from '../src/features/rooms/source-picker';
import type {MediaInput, Room} from '../src/features/rooms/types';
export default function CreateRoomScreen() {
  const c = useTheme(); const user = useAuth(s => s.session?.user); const params = useLocalSearchParams<{stationId?: string; bookmark?: string}>();
  const saved = useLibrary(s => s.mediaFavorites.find(x => x.id === params.bookmark));
  const current = player.getSnapshot().station; const initial = params.stationId && current?.id !== params.stationId ? null : current;
  const [name, setName] = useState(''); const [displayName, setDisplayName] = useState(''); const [privateRoom, setPrivateRoom] = useState(true);
  const [media, setMedia] = useState<MediaInput>(saved ? {kind: saved.media.category === 'music' ? 'audio' : saved.media.kind, url: saved.media.url ?? undefined, title: saved.media.title} : {kind: 'radio', stationId: params.stationId ?? initial?.id});
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const create = async () => {
    setBusy(true); setError(''); Keyboard.dismiss();
    try {const listener = await ensureListener(displayName); const room = await accountRequest<Room>('/api/v1/rooms/', {method: 'POST', body: {name: name.trim() || `Sala de ${listener.user.displayName}`.slice(0, 70), isPrivate: privateRoom, media}}); router.replace({pathname: '/room', params: {id: room.id, code: room.inviteCode ?? ''}});}
    catch (e) {setError(e instanceof Error ? e.message : 'No se pudo crear la sala.');} finally {setBusy(false);}
  };
  return <View style={{flex: 1, backgroundColor: c.bg}}><ScreenHeader title="Juntos suena mejor" subtitle="Una sala, tu gente y algo para compartir." back/><Page>
    {!user && <FormField label="Tu nombre" value={displayName} onChange={setDisplayName} placeholder="Cómo te verán tus amigos" maxLength={40}/>}
    <FormField label="Nombre de la sala (opcional)" value={name} onChange={setName} placeholder="Noche con amigos" maxLength={70}/>
    <Card><Label style={{fontWeight: '800'}}>Quién puede entrar</Label><View style={{flexDirection: 'row', gap: 8}}><Chip label="Solo con invitación" icon="lock-closed-outline" selected={privateRoom} onPress={() => setPrivateRoom(true)}/><Chip label="Pública" icon="earth-outline" selected={!privateRoom} onPress={() => setPrivateRoom(false)}/></View><Muted>{privateRoom ? 'Comparte el enlace o código con quienes quieras invitar.' : 'Aparecerá en Explorar para que otras personas puedan unirse.'}</Muted></Card>
    <Label style={{fontWeight: '800', fontSize: 19}}>Qué compartimos</Label><SourcePicker value={media} onChange={setMedia} initialStation={initial}/>
    {error && <Label accessibilityRole="alert" style={{color: c.live}}>{error}</Label>}
    <Button title={busy ? 'Preparando tu sala…' : 'Crear y entrar'} icon="people-outline" disabled={busy || name.trim().length === 1 || media.kind === 'radio' && !media.stationId || media.kind !== 'radio' && !media.url?.trim()} onPress={() => void create()}/>
    <Muted style={{textAlign: 'center'}}>Puedes proponer otro contenido y votar desde la sala.</Muted>
  </Page></View>;
}
