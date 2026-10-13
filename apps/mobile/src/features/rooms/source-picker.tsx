import {useDeferredValue, useState} from 'react';
import {Pressable, View} from 'react-native';
import {lookupStations, useStationFeed} from '../../catalog';
import {useQuery} from '@tanstack/react-query';
import {useLibrary} from '../../library';
import {useTheme} from '../../theme';
import {Artwork, Button, Chip, Label, Loading, Message, Muted, SearchField} from '../../ui';
import {FormField} from '../../components/forms';
import type {Station} from '../../types';
import type {MediaInput} from './types';
export function SourcePicker({value, onChange, initialStation}: {value: MediaInput; onChange: (value: MediaInput) => void; initialStation?: Station | null}) {
  const c = useTheme(); const country = useLibrary(s => s.country);
  const [text, setText] = useState(''); const q = useDeferredValue(text);
  const [picked, setSelected] = useState<Station | null>(initialStation ?? null);
  const lookup = useQuery({queryKey: ['room-station', value.stationId], queryFn: () => lookupStations([value.stationId!]), enabled: value.kind === 'radio' && !!value.stationId && picked?.id !== value.stationId, staleTime: 300000});
  const selected = picked?.id === value.stationId ? picked : lookup.data?.[0] ?? picked;
  const feed = useStationFeed({q: q || undefined, country: q ? undefined : country}, {enabled: value.kind === 'radio', limit: 12});
  return <View style={{gap: 14}}>
    <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>{([{kind: 'radio', label: 'Radio', icon: 'radio-outline'}, {kind: 'video', label: 'Video', icon: 'videocam-outline'}, {kind: 'audio', label: 'Música', icon: 'musical-notes-outline'}] as const).map(item => <Chip key={item.kind} label={item.label} icon={item.icon} selected={value.kind === item.kind || item.kind === 'video' && value.kind === 'youtube'} onPress={() => onChange(item.kind === 'radio' && selected ? {kind: 'radio', stationId: selected.id} : {kind: item.kind})}/>)}</View>
    {value.kind === 'radio' ? <>
      {selected && value.stationId === selected.id ? <View style={{flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: 18, backgroundColor: c.accentSoft}}><Artwork station={selected} size={52}/><View style={{flex: 1}}><Label numberOfLines={2} style={{fontWeight: '800'}}>{selected.name}</Label><Muted>{selected.country}</Muted></View><Chip label="Cambiar" onPress={() => onChange({kind: 'radio'})}/></View> : <>
        <SearchField value={text} onChange={value => setText(value.slice(0, 100))} placeholder="Buscar una emisora" label="Buscar contenido de radio"/>
        {feed.isPending ? <Loading/> : feed.isError ? <Message title="No se pudo buscar" body={feed.error.message} retry={() => feed.refetch()}/> : feed.items.map(station => <Pressable key={station.id} accessibilityRole="button" accessibilityLabel={`Usar ${station.name}`} onPress={() => {setSelected(station); onChange({kind: 'radio', stationId: station.id});}} style={({pressed}) => ({flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, opacity: pressed ? .7 : 1})}><Artwork station={station} size={42}/><View style={{flex: 1}}><Label numberOfLines={1} style={{fontWeight: '700'}}>{station.name}</Label><Muted>{station.country}</Muted></View></Pressable>)}
        {feed.hasNextPage && <Button title={feed.isFetchingNextPage ? 'Cargando…' : 'Más emisoras'} secondary onPress={feed.loadMore} disabled={feed.isFetchingNextPage}/>}
        {!feed.isPending && !feed.items.length && <Muted>No encontramos radios con esa búsqueda. Prueba otro nombre.</Muted>}
      </>}
    </> : <>
      <FormField label={value.kind === 'audio' ? 'Enlace de música' : 'Enlace de video'} value={value.url ?? ''} onChange={url => onChange({...value, url})} placeholder={value.kind === 'audio' ? 'YouTube, YouTube Music o archivo MP3 HTTPS' : 'Enlace de YouTube o archivo MP4/WebM HTTPS'} keyboardType="url" maxLength={2000}/>
      <FormField label="Título (opcional)" value={value.title ?? ''} onChange={title => onChange({...value, title})} placeholder="Cómo aparecerá en la sala" maxLength={120}/>
      <Muted>{value.kind === 'audio' ? 'YouTube y YouTube Music se reproducen con su video. También MP3, M4A, OGG, AAC o WAV en HTTPS.' : 'YouTube y archivos MP4/WebM públicos. Los videos que bloqueen la reproducción integrada mostrarán una explicación.'}</Muted>
    </>}
  </View>;
}
