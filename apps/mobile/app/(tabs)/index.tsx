import { useMemo, useState } from 'react';
import { View, Pressable, ScrollView, useWindowDimensions, type ViewStyle } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '../../src/icons';
import { useCountries, useStationFeed, useTags } from '../../src/catalog';
import { daySeed, listeningProfile, pickForDay } from '../../src/discovery';
import { recentIdsSnapshot, uniqueBroadcasts, useLibrary, useLibraryHydrated } from '../../src/library';
import { greeting, moods, useTheme } from '../../src/theme';
import { isActive, player, usePlayer } from '../../src/player';
import { BrandHeader, Page, Label, Muted, StationRow, Artwork, Loading, Message, SectionTitle, StationTile, IconButton, LiveBadge, flag, tagLabel, cardStyle } from '../../src/ui';
import type { Station } from '../../src/types';
import {DestinationShelf} from '../../src/features/home/destinations';

export default function Home() {
  const c = useTheme(); const hydrated = useLibraryHydrated(); const onboarded = useLibrary(s => s.onboarded);
  if (!hydrated) return <View style={{flex: 1, backgroundColor: c.bg}}/>;
  if (!onboarded) return <Redirect href="/onboarding"/>;
  return <HomeContent/>;
}

function HomeContent() {
  const c = useTheme(); const {width} = useWindowDimensions();
  const library = useLibrary();
  // Captured once: playing a station must not remove it from the cards the person is looking at.
  const [recentAtOpen] = useState(() => recentIdsSnapshot());
  const [tag, setTag] = useState('');
  const seed = daySeed();
  const profile = useMemo(() => listeningProfile(library.favorites, library.history, library.collections), [library.favorites, library.history, library.collections]);
  const likedTags = [...new Set([...profile.tags, ...library.likedTags])].slice(0, 5);
  const countries = useCountries();
  const countryName = countries.data?.find(x => x.code === library.country)?.name ?? library.country;
  // Suggestions come from the country where the person is; the world is only a fallback for small catalogs.
  const local = useStationFeed({country: library.country, order: 'discover', seed, boostTags: likedTags, exclude: recentAtOpen.slice(0, 10)}, {limit: 12});
  const needsWorld = local.isSuccess && local.items.length < 3;
  const world = useStationFeed({order: 'discover', seed, boostCountries: [library.country, ...profile.countries], boostTags: likedTags, exclude: recentAtOpen.slice(0, 10)}, {limit: 12, enabled: needsWorld});
  const featured = needsWorld ? {...world, items: [...local.items, ...world.items]} : local;
  const popular = useStationFeed({country: library.country, tag: tag || undefined, order: 'discover', seed}, {limit: 10});
  const tags = useTags();
  // Only genres that exist in the catalog facets (≥10 stations) and have a readable label.
  const known = new Map((tags.data ?? []).map(t => [t.value, t.label]));
  const chosen = library.likedTags.find(t => known.has(t));
  const inferred = profile.tags.find(t => known.has(t));
  const genre = chosen ?? inferred ?? pickForDay((tags.data ?? []).slice(0, 30).map(t => t.value), seed);
  const genreLabel = genre ? known.get(genre) ?? tagLabel(genre) : '';
  const genreLocal = useStationFeed({tag: genre, country: library.country, order: 'discover', seed, exclude: recentAtOpen}, {limit: 12, enabled: !!genre});
  const genreWorldNeeded = genreLocal.isSuccess && genreLocal.items.length < 4;
  const genreWorld = useStationFeed({tag: genre, order: 'discover', seed, exclude: recentAtOpen, boostCountries: [library.country]}, {limit: 12, enabled: !!genre && genreWorldNeeded});
  const genreFeed = genreWorldNeeded ? genreWorld : genreLocal;
  const genreTitle = (chosen ? `Porque te gusta: ${genreLabel}` : inferred ? `Más ${genreLabel.toLowerCase()} para ti` : `Género del día: ${genreLabel}`)
    + (genreWorldNeeded ? ' · en el mundo' : ` · en ${countryName}`);
  const hello = greeting();
  const cardWidth = Math.min(width, 480) - 40;
  const featuredItems = featured.items.slice(0, 5);
  return <View style={{flex: 1, backgroundColor: c.bg}}>
    <BrandHeader><IconButton icon="settings-outline" label="Ajustes y perfil" onPress={() => router.push('/settings')}/></BrandHeader>
    <Page>
    <Pressable accessibilityRole="search" accessibilityLabel="Buscar emisoras, países, ciudades y géneros" onPress={() => router.push('/search')} style={[cardStyle(c), {borderRadius: 16, paddingHorizontal: 14, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -4}]}>
      <Ionicons name="search" size={18} color={c.muted}/><Muted style={{fontSize: 14}}>Buscar emisoras, países, géneros…</Muted>
    </Pressable>
    <View style={{gap: 2}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><Label style={{fontSize: 22, lineHeight: 28, fontWeight: '800'}}>{hello.text}</Label><Ionicons name={hello.icon} size={20} color={hello.icon === 'moon' ? c.accent : '#E5A110'}/></View>
      <Muted style={{fontSize: 14}}>El mundo suena aquí.</Muted>
    </View>

    {featured.isPending ? <View style={{height: 186, borderRadius: 24, backgroundColor: c.surfaceAlt}}/> :
      featured.isError ? <Message title="El catálogo no está disponible" body={featured.error.message} retry={() => featured.refetch()}/> :
      featuredItems.length ? <FeaturedCarousel stations={featuredItems} width={cardWidth}/> :
      <Message title="Prueba otra frecuencia" body="No encontramos emisoras compatibles ahora. Elige otro ánimo o país." icon="radio-outline"/>}
    {featured.stale && <Muted style={{marginTop: -10}}>Mostrando el catálogo guardado: Radio Browser no respondió hace un momento.</Muted>}

    {library.history.length > 0 && <>
      <SectionTitle title="Continuar escuchando" action="Ver todo" onPress={() => router.push({pathname: '/library', params: {section: 'history'}})}/>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 12}} style={{marginHorizontal: -20}} contentInset={{left: 20}}>
        <View style={{width: 8}}/>{uniqueBroadcasts(library.history).slice(0, 10).map(s => <StationTile key={s.id} station={s} queue={{stations: uniqueBroadcasts(library.history), title: 'Historial'}}/>)}<View style={{width: 8}}/>
      </ScrollView>
    </>}

    <SectionTitle title="Explorar por estado de ánimo"/>
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10}}>
      {moods.map(m => {
        const selected = tag === m.tag;
        return <Pressable key={m.tag} accessibilityRole="button" accessibilityLabel={'Ánimo: ' + m.name} accessibilityState={{selected}} onPress={() => setTag(selected ? '' : m.tag)}
          style={({pressed}) => ({width: '22%', flexGrow: 1, minHeight: 82, borderRadius: 18, backgroundColor: m.color + (c.isDark ? '26' : '17'), alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: selected ? m.color : 'transparent', opacity: pressed ? .7 : 1})}>
          <Ionicons name={selected ? m.icon : `${m.icon}-outline`} size={26} color={m.color}/>
          <Label numberOfLines={1} style={{fontSize: 11, lineHeight: 14, fontWeight: '700', color: c.isDark ? c.text : m.color}}>{m.name}</Label>
        </Pressable>;
      })}
    </View>

    <SectionTitle title={tag ? `${moods.find(m => m.tag === tag)?.name} · en ${countryName}` : `Populares en ${countryName}`} action="Ver todo" onPress={() => router.push({pathname: '/search', params: {country: library.country, tag}})}/>
    {popular.isPending ? <Loading rows={4}/> : popular.isError ? <Message title="No pudimos cargar esta sección" body={popular.error.message} retry={() => popular.refetch()}/> :
      popular.items.length ? <View>{popular.items.slice(0, 5).map(s => <StationRow key={s.id} station={s} queue={{stations: popular.items, title: tag ? moods.find(m => m.tag === tag)?.name ?? tag : `Radios de ${countryName}`}}/>)}</View> :
      <Muted>No hay emisoras de este ánimo en {countryName}. Prueba otro ánimo o explora el mundo.</Muted>}

    {genre && genreFeed.items.length > 0 && <>
      <SectionTitle title={genreTitle} action="Explorar" onPress={() => router.push({pathname: '/search', params: genreWorldNeeded ? {tag: genre} : {tag: genre, country: library.country}})}/>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 12}} style={{marginHorizontal: -20}}>
        <View style={{width: 8}}/>{genreFeed.items.slice(0, 10).map(s => <StationTile key={s.id} station={s} queue={{stations: genreFeed.items, title: genreLabel}}/>)}<View style={{width: 8}}/>
      </ScrollView>
    </>}

    {countries.data && <DestinationShelf countries={countries.data} current={library.country} seed={seed}/>}
    <Pressable accessibilityRole="button" accessibilityLabel="Abrir el mapa de emisoras" onPress={() => router.push('/world')} style={({pressed}) => [cardStyle(c), {padding: 20, gap: 6, flexDirection: 'row', alignItems: 'center', opacity: pressed ? .8 : 1}]}>
      <View style={{flex: 1, gap: 4}}><Label style={{fontSize: 18, fontWeight: '800'}}>Un mundo por escuchar</Label><Muted>{countries.data ? `${countries.data.length} países con radio. Explóralos en el mapa.` : 'Explora emisoras por país y ciudad.'}</Muted></View>
      <View style={{width: 56, height: 56, borderRadius: 28, backgroundColor: c.primary + '1A', alignItems: 'center', justifyContent: 'center'}}><Ionicons name="earth" size={30} color={c.primaryText}/></View>
    </Pressable>
  </Page>
  </View>;
}

function FeaturedCarousel({stations, width}: {stations: Station[]; width: number}) {
  const c = useTheme(); const [index, setIndex] = useState(0); const playback = usePlayer();
  return <View style={{gap: 10}}>
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} snapToInterval={width + 12} decelerationRate="fast" style={{marginHorizontal: -20}} contentContainerStyle={{paddingHorizontal: 20, gap: 12}}
      onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / (width + 12)))}>
      {stations.map(station => {
        const current = playback.station?.id === station.id;
        const active = current && isActive(playback.state);
        return <Pressable key={station.id} accessibilityRole="button" accessibilityLabel={(active ? 'Pausar ' : 'Escuchar ') + station.name} onPress={() => current ? player.toggle() : player.select(station, {stations, title: 'Radios destacadas'})}
          style={{width, minHeight: 180, borderRadius: 24, padding: 18, overflow: 'hidden', backgroundColor: c.featuredFallback, experimental_backgroundImage: c.featured} as ViewStyle}>
          <View pointerEvents="none" style={{position: 'absolute', width: 200, height: 200, borderRadius: 100, right: -60, top: -70, backgroundColor: '#FFFFFF10'}}/>
          <View style={{flexDirection: 'row', gap: 16, alignItems: 'center'}}>
            <Artwork key={station.id} station={station} size={92}/>
            <View style={{flex: 1, gap: 4}}>
              <View style={{alignSelf: 'flex-start', backgroundColor: '#FFFFFF24', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2}}><Label style={{fontSize: 10, lineHeight: 15, color: '#E6E1FF', fontWeight: '800', letterSpacing: 1}}>RADIO DESTACADA</Label></View>
              <Label numberOfLines={2} style={{fontSize: 21, lineHeight: 26, fontWeight: '800', color: '#FFFFFF'}}>{station.name}</Label>
              <Label numberOfLines={1} style={{fontSize: 13, lineHeight: 18, color: '#D7DEF2'}}>{flag(station.countryCode)} {[station.country, station.region].filter(Boolean).join(' · ')}</Label>
              <Label numberOfLines={1} style={{fontSize: 12, lineHeight: 17, color: '#C3CBE4'}}>{station.tags.slice(0, 2).map(tagLabel).join(' · ') || station.codec}</Label>
            </View>
          </View>
          <View style={{marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            {current && playback.state === 'playing' ? <LiveBadge/> : <Label style={{fontSize: 12, color: '#D7DEF2'}}>{current && active ? 'Conectando…' : 'Toca para escuchar'}</Label>}
            <View style={{backgroundColor: '#FFFFFF', width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center'}}><Ionicons name={active ? 'pause' : 'play'} size={22} color="#1B2257" style={{marginLeft: active ? 0 : 2}}/></View>
          </View>
        </Pressable>;
      })}
    </ScrollView>
    <View style={{flexDirection: 'row', justifyContent: 'center', gap: 6}}>{stations.map((s, i) => <View key={s.id} style={{height: 6, width: i === index ? 18 : 6, borderRadius: 3, backgroundColor: i === index ? c.primary : c.border}}/>)}</View>
  </View>;
}
