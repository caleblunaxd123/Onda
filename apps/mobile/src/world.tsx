import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { lookupStations, useCountries, useMapArea, usePlaces, useStationFeed } from './catalog';
import { useLibrary } from './library';
import { isActive, player, usePlayer } from './player';
import { useTheme } from './theme';
import { Ionicons } from './icons';
import { Artwork, Chip, EmptyState, Label, ListFooter, Loading, Message, Muted, OptionPicker, PlayButton, StationRow, StationStatus, cardStyle, flag, formatCount, tagLabel } from './ui';
import type { Station } from './types';
import { cellsToFeatures, viewportKey, type Bounds, type Viewport } from './geo';
export { cellsToFeatures, clusterColor, clusterRadius, viewportKey, type Bounds, type Viewport } from './geo';

export function useWorldExplorer() {
  const preferred = useLibrary(s => s.country);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [missingGeo, setMissingGeo] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const zoom = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  /** Camera callbacks are debounced; TanStack Query cancels the request of a viewport that is no longer shown. */
  const onViewport = useCallback((bounds: Bounds, z: number) => {
    zoom.current = z;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setViewport(viewportKey(bounds, z)), 400);
  }, []);
  const filters = {country: country || undefined, region: region || undefined};
  const area = useMapArea(missingGeo ? null : viewport, filters);
  const list = useStationFeed(missingGeo ? {...filters, geo: 'missing'} : {...filters, bbox: viewport?.bbox}, {limit: 30, keepPrevious: true, enabled: missingGeo || !!viewport});
  const countries = useCountries();
  const places = usePlaces(country || undefined);
  const fromList = list.items.find(s => s.id === selectedId);
  const lookup = useQuery({queryKey: ['station', selectedId], enabled: !!selectedId && !fromList, staleTime: 300_000,
    queryFn: async ({signal}) => (await lookupStations([selectedId!], signal))[0] ?? null});
  const selected = fromList ?? lookup.data ?? null;
  const features = useMemo(() => cellsToFeatures(area.data), [area.data]);
  return {
    viewport, onViewport, zoom, area, list, features, countries, places, preferred,
    country, setCountry: (code: string) => {setCountry(code); setRegion(''); setSelectedId(null);},
    region, setRegion: (name: string) => {setRegion(name); setSelectedId(null);},
    missingGeo, setMissingGeo: (value: boolean) => {setMissingGeo(value); setSelectedId(null);},
    selectedId, selected, select: setSelectedId,
  };
}
export type WorldExplorer = ReturnType<typeof useWorldExplorer>;

/** Bottom panel shared by the native and web maps: filters, real counts, selection and the synced list. */
export function WorldPanel({explorer: e, onFocusStation, onFocusCountry, onFocusPlace, onReset}: {
  explorer: WorldExplorer; onFocusStation: (station: Station) => void; onFocusCountry: (bounds: Bounds | null) => void;
  onFocusPlace: (lat: number, lon: number) => void; onReset: () => void;
}) {
  const c = useTheme();
  const [picker, setPicker] = useState<'country' | 'place' | null>(null);
  const countryInfo = e.countries.data?.find(x => x.code === e.country);
  const total = e.missingGeo ? e.list.total : e.area.data?.total;
  const scope = e.region || countryInfo?.name || 'Zona visible';
  const listRef = useRef<FlatList<Station>>(null);
  useEffect(() => {
    if (!e.selectedId) return;
    const index = e.list.items.findIndex(s => s.id === e.selectedId);
    if (index >= 0) listRef.current?.scrollToIndex({index, viewPosition: 0, animated: true});
  }, [e.selectedId, e.list.items]);
  return <View style={[cardStyle(c), {flex: 1, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 26, borderTopRightRadius: 26, marginTop: -22, paddingTop: 8, paddingHorizontal: 16}]}>
    <View style={{alignSelf: 'center', width: 40, height: 4, borderRadius: 4, backgroundColor: c.border, marginBottom: 8}}/>
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
      <Label style={{fontSize: 24}}>{e.country ? flag(e.country) : '🌍'}</Label>
      <View style={{flex: 1}}>
        <Label numberOfLines={1} style={{fontSize: 17, fontWeight: '800'}}>{e.missingGeo ? `${countryInfo?.name ?? 'Todo el mundo'} · sin ubicación` : scope}</Label>
        <Muted accessibilityLiveRegion="polite">{total === undefined || total === null ? (e.area.isFetching || e.list.isFetching ? 'Buscando emisoras…' : 'Mueve el mapa para explorar') : `${formatCount(total)} ${total === 1 ? 'emisora' : 'emisoras'}${e.missingGeo ? '' : ' en el área visible'}`}</Muted>
      </View>
      {(e.area.isFetching || e.list.isFetching) && <Ionicons name="sync" size={16} color={c.muted}/>}
    </View>
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 10}}>
      <Chip icon="flag-outline" label={countryInfo?.name ?? 'País'} selected={!!e.country} onPress={() => setPicker('country')}/>
      <Chip icon="location-outline" label={e.region || 'Ciudad'} selected={!!e.region} onPress={() => e.country ? setPicker('place') : setPicker('country')}/>
      <Chip icon="eye-off-outline" label="Sin ubicación" selected={e.missingGeo} onPress={() => e.setMissingGeo(!e.missingGeo)}/>
      {(e.country || e.region || e.missingGeo) && <Chip icon="refresh" label="Todo el mundo" onPress={() => {e.setCountry(''); e.setMissingGeo(false); onReset();}}/>}
    </View>
    {e.selected && <SelectedStation station={e.selected} onClose={() => e.select(null)}/>}
    {e.area.isError && !e.missingGeo ? <Message title="No pudimos cargar el mapa" body={e.area.error.message} retry={() => e.area.refetch()}/> : null}
    <FlatList ref={listRef} data={e.list.items} keyExtractor={s => s.id} style={{flex: 1}} onEndReachedThreshold={0.5} onEndReached={e.list.loadMore}
      onScrollToIndexFailed={() => {}} keyboardShouldPersistTaps="handled"
      renderItem={({item}) => <StationRow station={item} selected={item.id === e.selectedId} onPress={() => {e.select(item.id); onFocusStation(item);}}/>}
      ListEmptyComponent={e.list.isPending && (e.viewport || e.missingGeo) ? <Loading/> : e.list.isError ? <Message title="Lista no disponible" body={e.list.error.message} retry={() => e.list.refetch()}/> :
        <EmptyState icon="map-outline" title={e.viewport || e.missingGeo ? 'No hay emisoras aquí' : 'Cargando el mapa'} body={e.missingGeo ? 'Todas las emisoras de esta selección tienen ubicación.' : 'Aleja el mapa o elige un país para descubrir más radios.'}/>}
      ListFooterComponent={<><ListFooter feed={e.list} endLabel="No hay más emisoras en esta zona."/><Muted style={{fontSize: 11, lineHeight: 15, paddingVertical: 10}}>Ubicaciones aportadas por la comunidad de Radio Browser; no son la posición verificada del transmisor. ONDA no usa tu GPS.</Muted></>}/>
    {picker === 'country' && <OptionPicker title="País" selected={e.country} onClose={() => setPicker(null)} loading={e.countries.isPending} error={e.countries.error?.message} retry={() => e.countries.refetch()}
      options={(e.countries.data ?? []).map(x => ({value: x.code, label: x.name, leading: flag(x.code), detail: formatCount(x.count)}))}
      onSelect={code => {e.setCountry(code); onFocusCountry(e.countries.data?.find(x => x.code === code)?.bounds ?? null);}}/>}
    {picker === 'place' && <OptionPicker title={`Ciudades de ${countryInfo?.name ?? ''}`} selected={e.region} onClose={() => setPicker(null)} loading={e.places.isPending} error={e.places.error?.message} retry={() => e.places.refetch()}
      options={(e.places.data ?? []).map(p => ({value: p.name, label: p.name, detail: formatCount(p.count)}))}
      onSelect={name => {e.setRegion(name); const place = e.places.data?.find(p => p.name === name); if (place?.latitude != null && place.longitude != null) onFocusPlace(place.latitude, place.longitude);}}/>}
  </View>;
}

function SelectedStation({station, onClose}: {station: Station; onClose: () => void}) {
  const c = useTheme(); const playback = usePlayer();
  const current = playback.station?.id === station.id; const active = current && isActive(playback.state);
  return <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, backgroundColor: c.primary + '12', marginBottom: 8, borderWidth: 1, borderColor: c.primary + '40'}}>
    <Artwork station={station} size={52}/>
    <View style={{flex: 1, gap: 2}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}><Label numberOfLines={1} style={{fontWeight: '800', flexShrink: 1}}>{station.name}</Label><StationStatus station={station}/></View>
      <Muted numberOfLines={1}>{flag(station.countryCode)} {[station.region, station.country].filter(Boolean).join(', ')}</Muted>
      {station.tags.length > 0 && <Muted numberOfLines={1} style={{fontSize: 12}}>{station.tags.slice(0, 3).map(tagLabel).join(' · ')}</Muted>}
    </View>
    <PlayButton active={active} label={active ? 'Pausar ' + station.name : 'Escuchar ' + station.name} onPress={() => current ? player.toggle() : player.select(station)}/>
    <Pressable accessibilityRole="button" accessibilityLabel="Cerrar selección" onPress={onClose} hitSlop={10}><Ionicons name="close" size={20} color={c.muted}/></Pressable>
  </View>;
}
