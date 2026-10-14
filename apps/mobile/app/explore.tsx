import {useState} from 'react';
import {FlatList, ScrollView, View} from 'react-native';
import {router, useLocalSearchParams} from 'expo-router';
import {useQuery} from '@tanstack/react-query';
import {request} from '../src/api';
import {fold} from '../src/format';
import {useLibrary, type MediaBookmark} from '../src/library';
import {useStationFeed} from '../src/catalog';
import {useAuth} from '../src/features/account/session';
import {RoomRow, OndaContentCard} from '../src/features/rooms/presentation';
import type {Station} from '../src/types';
import type {RoomSummary} from '../src/features/rooms/types';
import {Button, Chip, EmptyState, ListFooter, Message, Muted, ScreenHeader, SearchField, StationRow} from '../src/ui';
import {OndaAmbientBackground, OndaSkeleton} from '../src/components/experience';

/** Search only catalogues ONDA really has: rooms, saved media and radio. YouTube keeps its own browser. */
export default function ExploreScreen() {
  const params = useLocalSearchParams<{q?: string}>(); const [text, setText] = useState(params.q ?? '');
  const [tab, setTab] = useState<'rooms' | 'video' | 'music' | 'radio'>('rooms');
  const auth = useAuth(); const saved = useLibrary(s => s.mediaFavorites);
  const rooms = useQuery({queryKey: ['rooms', false, auth.session?.user.id], queryFn: ({signal}) => request<{items: RoomSummary[]}>('/api/v1/rooms/?mine=false', {signal, token: auth.session?.token}), enabled: tab === 'rooms', retry: 1});
  const feed = useStationFeed({q: text.trim() || undefined}, {enabled: tab === 'radio', limit: 20});
  const roomItems = (rooms.data?.items ?? []).filter(x => fold(x.name + ' ' + x.media.title).includes(fold(text)));
  const media = saved.filter(x => (tab === 'music' ? x.media.kind === 'audio' || x.media.category === 'music' : x.media.kind === 'video' || x.media.kind === 'youtube' && x.media.category !== 'music') && fold(x.media.title).includes(fold(text)));
  type Result = {kind: 'room'; value: RoomSummary} | {kind: 'station'; value: Station} | {kind: 'media'; value: MediaBookmark};
  const data: Result[] = tab === 'rooms' ? roomItems.map(value => ({kind: 'room', value})) : tab === 'radio' ? feed.items.map(value => ({kind: 'station', value})) : media.map(value => ({kind: 'media', value}));
  const loading = tab === 'rooms' ? rooms.isPending : tab === 'radio' ? feed.isPending : false;
  const error = tab === 'rooms' ? rooms.error : tab === 'radio' ? feed.error : null;
  return <View style={{flex: 1}}><OndaAmbientBackground/><ScreenHeader title="Explorar" back/>
    <FlatList data={data} keyExtractor={item => item.kind + item.value.id} initialNumToRender={8} windowSize={5} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      contentContainerStyle={{padding: 16, gap: 14, paddingBottom: 32}}
      ListHeaderComponent={<View style={{gap: 14, paddingBottom: 4}}><SearchField value={text} onChange={setText} placeholder="Sala, video, canción o emisora" label="Buscar contenido en ONDA"/>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>{([{id: 'rooms', name: 'Salas'}, {id: 'video', name: 'Videos'}, {id: 'music', name: 'Música'}, {id: 'radio', name: 'Radio'}] as const).map(x => <Chip key={x.id} label={x.name} selected={tab === x.id} onPress={() => setTab(x.id)}/>)}</ScrollView>
        {(tab === 'music' || tab === 'video') && <Muted>Tu contenido guardado. Para buscar en YouTube, elige esa fuente al crear tu sala.</Muted>}
      </View>}
      ListEmptyComponent={loading ? <OndaSkeleton/> : error ? <Message title="No pudimos cargar el contenido" body={error.message} retry={() => void (tab === 'rooms' ? rooms.refetch() : feed.refetch())}/> : <EmptyState icon={tab === 'radio' ? 'radio-outline' : tab === 'rooms' ? 'people-outline' : 'bookmark-outline'} title="Aquí empieza tu próximo descubrimiento" body={text ? 'Prueba otra búsqueda.' : tab === 'rooms' ? 'Crea una sala e invita a tus amigos.' : tab === 'radio' ? 'Busca una emisora, país o género.' : 'Guarda contenido desde una sala para volver a disfrutarlo.'}/>}
      ListFooterComponent={tab === 'radio' ? <ListFooter feed={feed}/> : tab === 'music' || tab === 'video' ? <View style={{paddingTop: 8}}><Button title="Buscar YouTube con mis amigos" icon="logo-youtube" onPress={() => router.push({pathname: '/create-room', params: {source: 'youtube'}})}/></View> : null}
      renderItem={({item}) => item.kind === 'room' ? <RoomRow room={item.value} ownerName={item.value.ownerId === auth.session?.user.id ? auth.session.user.displayName : undefined} onPress={() => router.push({pathname: '/room', params: {id: item.value.id}})}/>
        : item.kind === 'station' ? <StationRow station={item.value} card/>
        : <OndaContentCard media={item.value.media} onWatch={() => router.push({pathname: '/watch', params: {id: item.value.id}})} onShare={() => router.push({pathname: '/create-room', params: {bookmark: item.value.id}})}/>}
    />
  </View>;
}
