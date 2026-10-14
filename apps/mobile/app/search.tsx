import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useCountries, useLanguages, usePlaces, useStationFeed, useTags } from '../src/catalog';
import { useLibrary } from '../src/library';
import { useTheme } from '../src/theme';
import { Ionicons } from '../src/icons';
import { Chip, EmptyState, ListFooter, Loading, Message, Muted, OptionPicker, ScreenHeader, SearchField, SectionTitle, StationRow, Label, flag, fold, formatCount, matchesText } from '../src/ui';

type Tab = 'all' | 'stations' | 'countries' | 'genres' | 'places';
const tabs: {id: Tab; label: string}[] = [{id: 'all', label: 'Todo'}, {id: 'stations', label: 'Emisoras'}, {id: 'countries', label: 'Países'}, {id: 'genres', label: 'Géneros'}, {id: 'places', label: 'Ciudades'}];

export default function Search() {
  const c = useTheme();
  const params = useLocalSearchParams<{country?: string; tag?: string; q?: string; tab?: Tab}>();
  const [text, setText] = useState(params.q ?? '');
  const [q, setQ] = useState(params.q ?? '');
  const [tab, setTab] = useState<Tab>(tabs.some(item => item.id === params.tab) ? params.tab! : 'all');
  const [country, setCountry] = useState(params.country ?? '');
  const [tag, setTag] = useState(params.tag ?? '');
  const [language, setLanguage] = useState('');
  const [region, setRegion] = useState('');
  const [picker, setPicker] = useState<'language' | null>(null);
  const searches = useLibrary(s => s.searches); const remember = useLibrary(s => s.rememberSearch);
  useEffect(() => {const timer = setTimeout(() => setQ(text.trim()), 350); return () => clearTimeout(timer);}, [text]);
  const countries = useCountries(); const tags = useTags(); const languages = useLanguages(); const places = usePlaces(country || undefined);
  const filters = {q: q || undefined, country: country || undefined, tag: tag || undefined, language: language || undefined, region: region || undefined};
  const anyFilter = !!(q || country || tag || language || region);
  const feed = useStationFeed(filters, {limit: 30, enabled: anyFilter || tab === 'stations'});
  const needle = fold(q);
  const countryMatches = useMemo(() => (countries.data ?? []).filter(x => matchesText(`${x.name} ${x.code}`, needle)), [countries.data, needle]);
  const tagMatches = useMemo(() => (tags.data ?? []).filter(x => matchesText(`${x.label} ${x.value}`, needle)), [tags.data, needle]);
  const placeMatches = useMemo(() => (places.data ?? []).filter(x => matchesText(x.name, needle)), [places.data, needle]);
  const countryName = countries.data?.find(x => x.code === country)?.name ?? country;
  const clear = () => {setCountry(''); setTag(''); setLanguage(''); setRegion(''); setText('');};
  const chooseCountry = (code: string) => {setCountry(code); setRegion(''); setText(''); setTab('stations');};
  const chooseTag = (value: string) => {setTag(value); setText(''); setTab('stations');};
  const choosePlace = (name: string) => {setRegion(name); setText(''); setTab('stations');};
  const commit = () => {if (text.trim().length >= 2) remember(text.trim());};

  const active = [
    country && {key: 'country', label: `${flag(country)} ${countryName}`, remove: () => {setCountry(''); setRegion('');}},
    region && {key: 'region', label: region, remove: () => setRegion('')},
    tag && {key: 'tag', label: tags.data?.find(t => t.value === tag)?.label ?? tag, remove: () => setTag('')},
    language && {key: 'language', label: languages.data?.find(l => l.value === language)?.label ?? language, remove: () => setLanguage('')},
  ].filter(Boolean) as {key: string; label: string; remove: () => void}[];

  const header = <View style={{gap: 12, paddingBottom: 8}}>
    <SearchField value={text} onChange={setText} onSubmit={commit} autoFocus={!params.country && !params.tag && !params.tab} placeholder="Emisora, país, ciudad o género" label="Buscar emisoras"/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>{tabs.map(t => <Chip key={t.id} label={t.label} selected={tab === t.id} onPress={() => setTab(t.id)}/>)}</ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, alignItems: 'center'}}>
      {active.map(f => <Chip key={f.key} label={f.label} selected onRemove={f.remove}/>)}
      <Chip label={language ? 'Cambiar idioma' : 'Idioma'} icon="language-outline" onPress={() => setPicker('language')}/>
      {active.length > 0 && <Pressable accessibilityRole="button" onPress={clear} hitSlop={8} style={{paddingHorizontal: 6, minHeight: 38, justifyContent: 'center'}}><Label style={{color: c.primaryText, fontWeight: '700', fontSize: 13}}>Limpiar filtros</Label></Pressable>}
    </ScrollView>
    {!text && searches.length > 0 && tab === 'all' && !anyFilter && <View style={{gap: 8}}>
      <SectionTitle title="Búsquedas recientes"/>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{searches.slice(0, 8).map(s => <Chip key={s} label={s} icon="time-outline" onPress={() => setText(s)}/>)}</View>
    </View>}
  </View>;

  const stationList = (title: string) => <FlatList data={feed.items} keyExtractor={s => s.id} ListHeaderComponent={<>{header}<View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 4, paddingBottom: 4}}><Label accessibilityRole="header" style={{fontSize: 18, lineHeight: 24, fontWeight: '800'}}>{title}</Label>{feed.total !== null && <Muted accessibilityLiveRegion="polite">{formatCount(feed.total)} {feed.total === 1 ? 'emisora' : 'emisoras'}</Muted>}</View></>}
    contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 24}} keyboardShouldPersistTaps="handled" onEndReachedThreshold={0.6} onEndReached={feed.loadMore}
    renderItem={({item}) => <StationRow station={item} queue={{stations: feed.items, title: q ? `Búsqueda: ${q}` : countryName ? `Radios de ${countryName}` : 'Explorar emisoras'}}/>}
    ListEmptyComponent={feed.isPending ? <Loading rows={6}/> : feed.isError ? <Message title="No pudimos buscar" body={feed.error.message} retry={() => feed.refetch()}/> :
      <EmptyState icon="search-outline" title="Sin resultados" body={`No hay emisoras ${q ? `para «${q}» ` : ''}${active.length ? 'con estos filtros' : ''}. Prueba un nombre más corto o quita algún filtro.`}>
        {active.length > 0 && <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center'}}>{active.map(f => <Chip key={f.key} label={f.label} onRemove={f.remove}/>)}</View>}
      </EmptyState>}
    ListFooterComponent={<ListFooter feed={feed}/>}/>;

  const languagePicker = picker === 'language' && <OptionPicker title="Idioma" selected={language} onClose={() => setPicker(null)} onSelect={setLanguage}
    loading={languages.isPending} error={languages.error?.message} retry={() => languages.refetch()}
    options={(languages.data ?? []).map(l => ({value: l.value, label: l.label, detail: formatCount(l.count)}))}/>;

  let body;
  if (tab === 'stations' || (tab === 'all' && anyFilter && (country || tag || language || region))) body = stationList(anyFilter ? 'Emisoras' : 'Más escuchadas');
  else if (tab === 'countries') body = <FlatList data={countryMatches} keyExtractor={x => x.code} ListHeaderComponent={header} contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 24}} keyboardShouldPersistTaps="handled" initialNumToRender={20}
    ListEmptyComponent={countries.isPending ? <Loading/> : countries.isError ? <Message title="No pudimos cargar los países" body={countries.error.message} retry={() => countries.refetch()}/> : <Muted>Ningún país coincide.</Muted>}
    renderItem={({item}) => <FacetRow leading={flag(item.code)} label={item.name} detail={`${formatCount(item.count)} emisoras`} selected={item.code === country} onPress={() => chooseCountry(item.code)}/>}/>;
  else if (tab === 'genres') body = <FlatList data={tagMatches} keyExtractor={x => x.value} ListHeaderComponent={header} contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 24}} keyboardShouldPersistTaps="handled"
    ListEmptyComponent={tags.isPending ? <Loading/> : tags.isError ? <Message title="No pudimos cargar los géneros" body={tags.error.message} retry={() => tags.refetch()}/> : <Muted>Ningún género coincide.</Muted>}
    renderItem={({item}) => <FacetRow icon="musical-notes-outline" label={item.label} detail={`${formatCount(item.count)} emisoras`} selected={item.value === tag} onPress={() => chooseTag(item.value)}/>}/>;
  else if (tab === 'places') body = <FlatList data={country ? placeMatches : []} keyExtractor={x => x.name} ListHeaderComponent={header} contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 24}} keyboardShouldPersistTaps="handled"
    ListEmptyComponent={!country ? <EmptyState icon="business-outline" title="Elige primero un país" body="Las ciudades y regiones vienen de Radio Browser y se agrupan por país."><Chip label="Ver países" selected onPress={() => setTab('countries')}/></EmptyState>
      : places.isPending ? <Loading/> : places.isError ? <Message title="No pudimos cargar las ciudades" body={places.error.message} retry={() => places.refetch()}/> : <Muted>No hay ciudades registradas para {countryName}.</Muted>}
    renderItem={({item}) => <FacetRow icon="location-outline" label={item.name} detail={`${formatCount(item.count)} emisoras`} selected={item.name === region} onPress={() => choosePlace(item.name)}/>}/>;
  else body = <FlatList data={q ? feed.items.slice(0, 6) : []} keyExtractor={s => s.id} contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 24}} keyboardShouldPersistTaps="handled"
    ListHeaderComponent={<>{header}{q ? <SectionTitle title="Emisoras" action={feed.items.length > 6 ? 'Ver todas' : undefined} onPress={() => setTab('stations')}/> : null}</>}
    renderItem={({item}) => <StationRow station={item} queue={{stations: feed.items, title: `Búsqueda: ${q}`}}/>}
    ListEmptyComponent={q ? (feed.isPending ? <Loading/> : feed.isError ? <Message title="No pudimos buscar" body={feed.error.message} retry={() => feed.refetch()}/> : <Muted style={{paddingVertical: 8}}>Ninguna emisora se llama así. Mira países y géneros abajo.</Muted>) : null}
    ListFooterComponent={<View style={{gap: 14, paddingTop: 14}}>
      {(!q || countryMatches.length > 0) && <SectionTitle title="Países" action="Ver todos" onPress={() => setTab('countries')}/>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 14}}>
        {(q ? countryMatches : [...(countries.data ?? [])].sort((a, b) => b.count - a.count)).slice(0, 12).map(x => <Pressable key={x.code} accessibilityRole="button" accessibilityLabel={x.name} onPress={() => chooseCountry(x.code)} style={{width: 72, alignItems: 'center', gap: 6}}>
          <View style={{width: 58, height: 58, borderRadius: 29, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border}}><Text style={{fontSize: 30}}>{flag(x.code)}</Text></View>
          <Muted numberOfLines={2} style={{fontSize: 11, lineHeight: 14, textAlign: 'center', color: c.text}}>{x.name}</Muted>
        </Pressable>)}
        {countries.isPending && <Loading rows={1}/>}
      </ScrollView>
      {(!q || tagMatches.length > 0) && <SectionTitle title="Géneros" action="Ver todos" onPress={() => setTab('genres')}/>}
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{tagMatches.slice(0, 14).map(t => <Chip key={t.value} label={t.label} onPress={() => chooseTag(t.value)}/>)}</View>
    </View>}/>;

  return <View style={{flex: 1}}>
    <ScreenHeader title="Buscar" subtitle="Encuentra lo que te gusta" back/>
    {body}
    {languagePicker}
  </View>;
}

function FacetRow({label, detail, leading, icon, selected, onPress}: {label: string; detail: string; leading?: string; icon?: React.ComponentProps<typeof Ionicons>['name']; selected: boolean; onPress: () => void}) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed}) => ({minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: c.border, opacity: pressed ? .6 : 1})}>
    {leading ? <Text style={{fontSize: 24}}>{leading}</Text> : <Ionicons name={icon!} size={22} color={c.primaryText}/>}
    <Label numberOfLines={1} style={{flex: 1, fontWeight: selected ? '700' : '500'}}>{label}</Label><Muted>{detail}</Muted>
    <Ionicons name={selected ? 'checkmark-circle' : 'chevron-forward'} size={18} color={selected ? c.primaryText : c.muted}/>
  </Pressable>;
}
