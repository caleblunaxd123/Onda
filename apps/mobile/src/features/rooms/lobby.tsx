import {useState} from 'react';
import {FlatList, Pressable, View} from 'react-native';
import {router} from 'expo-router';
import {useQuery} from '@tanstack/react-query';
import {request} from '../../api';
import {useTheme} from '../../theme';
import {Ionicons} from '../../icons';
import {Artwork, BrandHeader, Button, Card, Chip, EmptyState, IconButton, Label, Loading, Message, Muted, Sheet} from '../../ui';
import {FormField} from '../../components/forms';
import {useAuth} from '../account/session';
import {mediaLabel, type RoomSummary} from './types';
export default function RoomsScreen() {
  const c = useTheme(); const auth = useAuth(); const [mine, setMine] = useState(false); const [invite, setInvite] = useState(false); const [code, setCode] = useState(''); const [kind, setKind] = useState('all');
  const rooms = useQuery({queryKey: ['rooms', mine, auth.session?.user.id], queryFn: ({signal}) => request<{items: RoomSummary[]}>('/api/v1/rooms/?mine=' + mine, {signal, token: auth.session?.token}), refetchInterval: 15000, retry: 1});
  const items = (rooms.data?.items ?? []).filter(room => kind === 'all' || room.media.kind === kind || kind === 'audio' && room.media.category === 'music' || kind === 'video' && room.media.kind === 'youtube' && room.media.category !== 'music');
  return <View style={{flex: 1, backgroundColor: c.bg}}>
    <BrandHeader title="Juntos" emoji="✨" subtitle="Radio, música y video con tu gente."><IconButton icon="person-outline" label="Tu cuenta" onPress={() => router.push('/account')}/></BrandHeader>
    <FlatList data={items} keyExtractor={room => room.id} contentContainerStyle={{padding: 20, gap: 14, paddingBottom: 30}} onRefresh={() => void rooms.refetch()} refreshing={rooms.isRefetching}
      ListHeaderComponent={<View style={{gap: 16, paddingBottom: 16}}>
        <Card><Label style={{fontWeight: '900', fontSize: 24, lineHeight: 29}}>Dale play a un buen momento.</Label><Muted>Crea una sala privada o entra con una invitación. La cuenta es opcional.</Muted><Button title="Crear sala" icon="add" onPress={() => router.push('/create-room')}/><Button title="Tengo una invitación" secondary icon="link-outline" onPress={() => setInvite(true)}/></Card>
        <View style={{flexDirection: 'row', gap: 8}}><Chip label="Explorar" selected={!mine} onPress={() => setMine(false)}/><Chip label="Mis salas" selected={mine} onPress={() => setMine(true)}/></View>
        <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>{[{id: 'all', name: 'Todo'}, {id: 'radio', name: 'Radio'}, {id: 'audio', name: 'Música'}, {id: 'video', name: 'Video'}].map(item => <Chip key={item.id} label={item.name} selected={kind === item.id} onPress={() => setKind(item.id)}/>)}</View>
      </View>}
      ListEmptyComponent={rooms.isPending ? <Loading/> : rooms.isError ? <Message title="No se pudieron cargar las salas" body={rooms.error.message} retry={() => rooms.refetch()}/> : <EmptyState icon="people-outline" title="Tu próxima sala empieza aquí" body={mine ? 'Las salas que crees aparecerán aquí. Hasta 3 abiertas a la vez.' : 'Crea una sala e invita a tu gente, o prueba otro tipo de contenido.'}/>}
      renderItem={({item}) => <Pressable accessibilityRole="button" accessibilityLabel={`Entrar a ${item.name}`} onPress={() => router.push({pathname: '/room', params: {id: item.id}})} style={({pressed}) => ({borderRadius: 22, padding: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, opacity: pressed ? .7 : 1, gap: 12})}>
        <View style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}>{item.media.station ? <Artwork station={item.media.station} size={58}/> : <View style={{width: 58, height: 58, borderRadius: 18, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center'}}><Ionicons name={item.media.kind === 'audio' ? 'musical-notes' : 'videocam'} size={26} color={c.accent}/></View>}<View style={{flex: 1}}><Label numberOfLines={2} style={{fontWeight: '800', fontSize: 17}}>{item.name}</Label><Muted numberOfLines={1}>{item.media.title}</Muted></View><Ionicons name="arrow-forward" size={20} color={c.primaryText}/></View>
        <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}><Ionicons name={item.isPrivate ? 'lock-closed-outline' : 'people-outline'} size={15} color={c.muted}/><Muted>{item.listeners} {item.listeners === 1 ? 'persona' : 'personas'} · {mediaLabel[item.media.kind]}{item.isPrivate ? ' · privada' : ''}</Muted></View>
      </Pressable>}/>
    {invite && <Sheet title="Entrar con invitación" onClose={() => setInvite(false)}><Muted>Pega el código de 12 caracteres o el enlace que recibiste.</Muted><FormField label="Enlace o código" value={code} onChange={setCode} maxLength={300}/><Button title="Entrar" disabled={!code.trim()} onPress={() => {const match = code.match(/(?:code=|join\/)([a-f0-9]{12})/i); const clean = match?.[1] ?? code.trim(); setInvite(false); router.push({pathname: '/room', params: {code: clean}});}}/></Sheet>}
  </View>;
}
