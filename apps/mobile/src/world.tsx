import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, View, type ViewStyle } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { lookupStations, useCountries, useLanguages, useMapArea, usePlaces, useStationFeed, useTags } from './catalog';
import { useLibrary } from './library';
import { isActive, player, usePlayer } from './player';
import { useTheme } from './theme';
import { Ionicons } from './icons';
import { Artwork, Button, Chip, EmptyState, IconButton, Label, ListFooter, Loading, Message, Muted, OptionPicker, PlayButton, Sheet, StationRow, StationStatus, cardStyle, flag, formatCount, tagLabel } from './ui';
import { Equalizer, SoundWaves, Waveform } from './waves';
import type { Station } from './types';
import { cellsToFeatures, viewportKey, type Bounds, type Viewport } from './geo';
export { cellsToFeatures, clusterColor, clusterRadius, viewportKey, type Bounds, type Viewport } from './geo';

export function useWorldExplorer() {
  const preferred = useLibrary(s => s.country);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [tag, setTag] = useState('');
  const [language, setLanguage] = useState('');
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
  const filters = {country: country || undefined, region: region || undefined, tag: tag || undefined, language: language || undefined};
  const area = useMapArea(missingGeo ? null : viewport, filters);
  const list = useStationFeed(missingGeo ? {...filters, geo: 'missing'} : {...filters, bbox: viewport?.bbox}, {limit: 30, keepPrevious: true, enabled: missingGeo || !!viewport});
  const countries = useCountries();
  const places = usePlaces(country || undefined);
  const fromList = list.items.find(s => s.id === selectedId);
  const lookup = useQuery({queryKey: ['station', selectedId], enabled: !!selectedId && !fromList, staleTime: 300_000,
    queryFn: async ({signal}) => (await lookupStations([selectedId!], signal))[0] ?? null});
  const selected = fromList ?? lookup.data ?? null;
  const features = useMemo(() => cellsToFeatures(area.data), [area.data]);
  const total = missingGeo ? list.total : area.data?.total ?? null;
  return {
    viewport, onViewport, zoom, area, list, features, countries, places, preferred, total,
    country, setCountry: (code: string) => {setCountry(code); setRegion(''); setSelectedId(null);},
    region, setRegion: (name: string) => {setRegion(name); setSelectedId(null);},
    tag, setTag: (value: string) => {setTag(value); setSelectedId(null);},
    language, setLanguage: (value: string) => {setLanguage(value); setSelectedId(null);},
    missingGeo, setMissingGeo: (value: boolean) => {setMissingGeo(value); setSelectedId(null);},
    selectedId, selected, select: setSelectedId,
    refresh: () => {void area.refetch(); void list.refetch();},
  };
}
export type WorldExplorer = ReturnType<typeof useWorldExplorer>;

/** Floating counter over the map, as in the owner's model: real number of stations in the visible area. */
export function MapCountBadge({explorer: e}: {explorer: WorldExplorer}) {
  const c = useTheme(); const playback = usePlayer();
  if (e.total === null) return e.area.isFetching ? <View style={[cardStyle(c), {position: 'absolute', left: 14, bottom: 36, padding: 12, borderRadius: 18}]}><ActivityIndicator color={c.primary}/></View> : null;
  return <View pointerEvents="none" accessibilityLiveRegion="polite" accessibilityLabel={`${e.total} emisoras en esta zona`} style={{position: 'absolute', left: 14, bottom: 34, alignItems: 'center', justifyContent: 'center'}}>
    <SoundWaves size={92} color={c.primary} state={playback.state === 'playing' ? 'playing' : 'idle'}/>
    <View style={[cardStyle(c), {borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.isDark ? '#142240EE' : '#FFFFFFEE', minWidth: 104}]}>
      <Equalizer color={c.primary} active={playback.state === 'playing'} height={16}/>
      <Label style={{fontSize: 24, lineHeight: 28, fontWeight: '900', color: c.text}}>{formatCount(e.total)}</Label>
      <Muted style={{fontSize: 12, lineHeight: 15}}>{e.total === 1 ? 'emisora' : 'emisoras'}{'\n'}en esta zona</Muted>
    </View>
  </View>;
}

/** Bottom panel shared by the native and web maps: filters, real counts, selection and the synced list. */
export function WorldPanel({explorer: e, onFocusStation, onFocusCountry, onFocusPlace, onReset}: {
  explorer: WorldExplorer; onFocusStation: (station: Station) => void; onFocusCountry: (bounds: Bounds | null) => void;
  onFocusPlace: (lat: number, lon: number) => void; onReset: () => void;
}) {
  const c = useTheme(); const playback = usePlayer();
  const [picker, setPicker] = useState<'country' | 'place' | 'more' | null>(null);
  const countryInfo = e.countries.data?.find(x => x.code === e.country);
  const scope = e.region || countryInfo?.name || 'Zona visible';
  const extra = (e.tag ? 1 : 0) + (e.language ? 1 : 0);
  const listRef = useRef<FlatList<Station>>(null);
  useEffect(() => {
    if (!e.selectedId) return;
    const index = e.list.items.findIndex(s => s.id === e.selectedId);
    if (index >= 0) listRef.current?.scrollToIndex({index, viewPosition: 0, animated: true});
  }, [e.selectedId, e.list.items]);
  const fetching = e.area.isFetching || e.list.isFetching;
  return <View style={[cardStyle(c), {flex: 1, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24, paddingTop: 8, paddingHorizontal: 14, backgroundColor: c.bg}]}>
    <View style={{alignSelf: 'center', width: 44, height: 5, borderRadius: 4, backgroundColor: c.border, marginBottom: 10}}/>
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
      <View style={{width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary + '1A'}}>
        <Label style={{fontSize: 28, lineHeight: 34}}>{e.country ? flag(e.country) : '🌍'}</Label>
      </View>
      <View style={{flex: 1}}>
        <Label numberOfLines={1} style={{fontSize: 20, lineHeight: 26, fontWeight: '900'}}>{e.missingGeo ? `${countryInfo?.name ?? 'Todo el mundo'} · sin ubicación` : scope}</Label>
        <Muted accessibilityLiveRegion="polite" style={{fontSize: 14}}>{e.total === null ? (fetching ? 'Buscando emisoras…' : 'Mueve el mapa para explorar') : `${formatCount(e.total)} ${e.total === 1 ? 'emisora' : 'emisoras'}${e.missingGeo ? '' : ' en el área visible'}`}</Muted>
      </View>
      <View style={{position: 'absolute', right: 54, top: 0}} pointerEvents="none"><Waveform active={playback.state === 'playing'} height={34} bars={14} opacity={0.3}/></View>
      <IconButton icon="refresh" label="Actualizar emisoras de la zona" onPress={e.refresh}/>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow: 0, marginHorizontal: -14}} contentContainerStyle={{gap: 8, paddingVertical: 12, paddingHorizontal: 14}}>
      <Chip icon="flag-outline" label={countryInfo?.name ?? 'País'} selected={!!e.country} onPress={() => setPicker('country')}/>
      <Chip icon="location-outline" label={e.region || 'Ciudad'} selected={!!e.region} onPress={() => e.country ? setPicker('place') : setPicker('country')}/>
      <Chip icon="eye-off-outline" label="Sin ubicación" selected={e.missingGeo} onPress={() => e.setMissingGeo(!e.missingGeo)}/>
      <Pressable accessibilityRole="button" accessibilityLabel={extra ? `Más filtros, ${extra} activos` : 'Más filtros'} onPress={() => setPicker('more')}
        style={({pressed}) => ({minHeight: 38, paddingHorizontal: 14, borderRadius: 99, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: extra ? c.accent : c.accentSoft, opacity: pressed ? .7 : 1})}>
        <Ionicons name="options-outline" size={16} color={extra ? '#FFFFFF' : c.accent}/>
        <Label style={{fontSize: 13, fontWeight: '700', color: extra ? '#FFFFFF' : c.accent}}>{extra ? `Más filtros · ${extra}` : 'Más filtros'}</Label>
        <Ionicons name="chevron-down" size={14} color={extra ? '#FFFFFF' : c.accent}/>
      </Pressable>
      {(e.country || e.region || e.missingGeo || extra > 0) && <Chip icon="refresh" label="Todo el mundo" onPress={() => {e.setCountry(''); e.setMissingGeo(false); e.setTag(''); e.setLanguage(''); onReset();}}/>}
    </ScrollView>
    {e.selected && <SelectedStation station={e.selected} onClose={() => e.select(null)}/>}
    {e.area.isError && !e.missingGeo ? <Message title="No pudimos cargar el mapa" body={e.area.error.message} retry={() => e.area.refetch()}/> : null}
    <FlatList ref={listRef} data={e.list.items} keyExtractor={s => s.id} style={{flex: 1}} onEndReachedThreshold={0.5} onEndReached={e.list.loadMore}
      onScrollToIndexFailed={() => {}} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom: 8, paddingHorizontal: 2, paddingTop: 2}}
      renderItem={({item}) => <StationRow card station={item} selected={item.id === e.selectedId} onPress={() => {e.select(item.id); onFocusStation(item);}}/>}
      ListEmptyComponent={e.list.isPending && (e.viewport || e.missingGeo) ? <Loading/> : e.list.isError ? <Message title="Lista no disponible" body={e.list.error.message} retry={() => e.list.refetch()}/> :
        <EmptyState icon="map-outline" title={e.viewport || e.missingGeo ? 'No hay emisoras aquí' : 'Cargando el mapa'} body={e.missingGeo ? 'Todas las emisoras de esta selección tienen ubicación.' : 'Aleja el mapa, cambia los filtros o elige un país para descubrir más radios.'}/>}
      ListFooterComponent={<><ListFooter feed={e.list} endLabel="No hay más emisoras en esta zona."/><Muted style={{fontSize: 11, lineHeight: 15, paddingVertical: 10}}>Ubicaciones aportadas por la comunidad de Radio Browser; no son la posición verificada del transmisor. ONDA no usa tu GPS.</Muted></>}/>
    {picker === 'country' && <OptionPicker title="País" selected={e.country} onClose={() => setPicker(null)} loading={e.countries.isPending} error={e.countries.error?.message} retry={() => e.countries.refetch()}
      options={(e.countries.data ?? []).map(x => ({value: x.code, label: x.name, leading: flag(x.code), detail: formatCount(x.count)}))}
      onSelect={code => {e.setCountry(code); onFocusCountry(e.countries.data?.find(x => x.code === code)?.bounds ?? null);}}/>}
    {picker === 'place' && <OptionPicker title={`Ciudades de ${countryInfo?.name ?? ''}`} selected={e.region} onClose={() => setPicker(null)} loading={e.places.isPending} error={e.places.error?.message} retry={() => e.places.refetch()}
      options={(e.places.data ?? []).map(p => ({value: p.name, label: p.name, detail: formatCount(p.count)}))}
      onSelect={name => {e.setRegion(name); const place = e.places.data?.find(p => p.name === name); if (place?.latitude != null && place.longitude != null) onFocusPlace(place.latitude, place.longitude);}}/>}
    {picker === 'more' && <MoreFilters explorer={e} onClose={() => setPicker(null)}/>}
  </View>;
}

/** Genre and language filters applied to both the map clusters and the list. */
function MoreFilters({explorer: e, onClose}: {explorer: WorldExplorer; onClose: () => void}) {
  const tags = useTags(); const languages = useLanguages();
  const [sub, setSub] = useState<'tag' | 'language' | null>(null);
  if (sub === 'tag') return <OptionPicker title="Género" selected={e.tag} onClose={onClose} onSelect={e.setTag} loading={tags.isPending} error={tags.error?.message} retry={() => tags.refetch()}
    options={(tags.data ?? []).map(t => ({value: t.value, label: t.label, detail: formatCount(t.count)}))}/>;
  if (sub === 'language') return <OptionPicker title="Idioma" selected={e.language} onClose={onClose} onSelect={e.setLanguage} loading={languages.isPending} error={languages.error?.message} retry={() => languages.refetch()}
    options={(languages.data ?? []).map(l => ({value: l.value, label: l.label, detail: formatCount(l.count)}))}/>;
  const tagName = tags.data?.find(t => t.value === e.tag)?.label ?? (e.tag ? tagLabel(e.tag) : '');
  const languageName = languages.data?.find(l => l.value === e.language)?.label ?? e.language;
  return <Sheet title="Más filtros" onClose={onClose}>
    <Muted style={{paddingBottom: 8}}>Se aplican al mapa y a la lista de la zona visible.</Muted>
    <FilterRow icon="musical-notes-outline" label="Género" value={tagName || 'Todos'} onPress={() => setSub('tag')} onClear={e.tag ? () => e.setTag('') : undefined}/>
    <FilterRow icon="language-outline" label="Idioma" value={languageName || 'Todos'} onPress={() => setSub('language')} onClear={e.language ? () => e.setLanguage('') : undefined}/>
    <View style={{paddingTop: 10}}><Button title="Listo" onPress={onClose}/></View>
  </Sheet>;
}

function FilterRow({icon, label, value, onPress, onClear}: {icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; onPress: () => void; onClear?: () => void}) {
  const c = useTheme();
  return <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={({pressed}) => ({flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? .6 : 1})}>
      <View style={{width: 38, height: 38, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center'}}><Ionicons name={icon} size={20} color={c.accent}/></View>
      <Label style={{flex: 1, fontWeight: '700'}}>{label}</Label><Muted>{value}</Muted><Ionicons name="chevron-forward" size={18} color={c.muted}/>
    </Pressable>
    {onClear && <IconButton icon="close" plain label={`Quitar filtro de ${label.toLowerCase()}`} onPress={onClear}/>}
  </View>;
}

function SelectedStation({station, onClose}: {station: Station; onClose: () => void}) {
  const c = useTheme(); const playback = usePlayer();
  const current = playback.station?.id === station.id; const active = current && isActive(playback.state);
  return <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 20, backgroundColor: c.primary + '12', marginBottom: 10, borderWidth: 1, borderColor: c.primary + '40', experimental_backgroundImage: c.isDark ? undefined : 'linear-gradient(120deg, #E3F7FB 0%, #EEE9FE 100%)'} as ViewStyle}>
    <Artwork station={station} size={54}/>
    <View style={{flex: 1, gap: 2}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}><Label numberOfLines={1} style={{fontWeight: '800', flexShrink: 1}}>{station.name}</Label><StationStatus station={station}/></View>
      <Muted numberOfLines={1}>{flag(station.countryCode)} {[station.region, station.country].filter(Boolean).join(', ')}</Muted>
      {station.tags.length > 0 && <Muted numberOfLines={1} style={{fontSize: 12}}>{station.tags.slice(0, 3).map(tagLabel).join(' · ')}</Muted>}
    </View>
    <PlayButton active={active} label={active ? 'Pausar ' + station.name : 'Escuchar ' + station.name} onPress={() => current ? player.toggle() : player.select(station)}/>
    <Pressable accessibilityRole="button" accessibilityLabel="Cerrar selección" onPress={onClose} hitSlop={10}><Ionicons name="close" size={20} color={c.muted}/></Pressable>
  </View>;
}
