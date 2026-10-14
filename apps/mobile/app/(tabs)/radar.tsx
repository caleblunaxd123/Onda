import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Share, View, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '../../src/icons';
import { useCountries, useStationFeed } from '../../src/catalog';
import { daySeed, listeningProfile } from '../../src/discovery';
import { recentIdsSnapshot, useLibrary, useLibraryHydrated } from '../../src/library';
import { isActive, player, usePlayer } from '../../src/player';
import { useTheme } from '../../src/theme';
import { Label, Muted, Artwork, Chip, Favorite, Loading, Message, IconButton, BrandHeader, LiveBadge, PlayButton, flag, tagLabel, cardStyle, stateLabels } from '../../src/ui';

export default function Radar() {
  const hydrated = useLibraryHydrated();
  return hydrated ? <RadarContent/> : <View style={{flex: 1}}/>;
}

function RadarContent() {
  const c = useTheme(); const playback = usePlayer(); const [height, setHeight] = useState(0);
  const [seed, setSeed] = useState(daySeed());
  const [autoTune, setAutoTune] = useState(false);
  const library = useLibrary();
  const profile = useMemo(() => listeningProfile(library.favorites, library.history, library.collections), [library.favorites, library.history, library.collections]);
  const [scope, setScope] = useState<'country' | 'world'>('country');
  // Captured once: tuning a card adds it to history, which must not reload the feed under the person's finger.
  const [recentAtOpen] = useState(() => recentIdsSnapshot());
  const countries = useCountries();
  const countryName = countries.data?.find(x => x.code === library.country)?.name ?? library.country;
  const feed = useStationFeed({order: 'discover', seed, country: scope === 'country' ? library.country : undefined,
    boostTags: [...new Set([...profile.tags, ...library.likedTags])].slice(0, 5), boostCountries: [library.country, ...profile.countries], exclude: recentAtOpen}, {limit: 20});
  return <View style={{flex: 1}}>
    <BrandHeader title="Radio Radar" emoji="📡" subtitle={autoTune ? 'Sintonía automática: suena al deslizar.' : 'Desliza y descubre nuevas emisoras.'}>
      <IconButton icon={autoTune ? 'radio' : 'radio-outline'} tint={autoTune ? c.primaryText : undefined} label={autoTune ? 'Desactivar sintonía automática' : 'Activar sintonía automática al deslizar'} onPress={() => setAutoTune(!autoTune)}/>
      <IconButton icon="shuffle" label="Barajar el radar" onPress={() => setSeed(Math.floor(Math.random() * 1e9))}/>
    </BrandHeader>
    <View style={{flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 4}}>
      <Chip label={`${flag(library.country)} ${countryName}`} selected={scope === 'country'} onPress={() => setScope('country')}/>
      <Chip label="🌍 Todo el mundo" selected={scope === 'world'} onPress={() => setScope('world')}/>
    </View>
    <View style={{flex: 1}} onLayout={e => setHeight(e.nativeEvent.layout.height)}>
      {feed.isPending || !height ? <View style={{padding: 20}}><Loading rows={4}/></View> :
        feed.isError ? <View style={{padding: 20}}><Message title="Radar sin señal" body={feed.error.message} retry={() => feed.refetch()}/></View> :
        !feed.items.length ? <View style={{padding: 20}}><Message title="Sin emisoras disponibles" body={scope === 'country' ? `No encontramos más emisoras en ${countryName}. Prueba «Todo el mundo».` : 'Prueba a barajar el radar.'} icon="radio-outline"/></View> :
        <FlatList data={feed.items} pagingEnabled keyExtractor={s => s.id} showsVerticalScrollIndicator={false} getItemLayout={(_, index) => ({length: height, offset: height * index, index})}
          onEndReachedThreshold={3} onEndReached={feed.loadMore} windowSize={3} initialNumToRender={2} maxToRenderPerBatch={2}
          onMomentumScrollEnd={e => {
            const station = feed.items[Math.round(e.nativeEvent.contentOffset.y / height)];
            // Streams are never preloaded; with auto-tune on, only the card that comes to rest starts playing.
            if (station && autoTune && playback.station?.id !== station.id) player.select(station);
          }}
          ListFooterComponent={feed.isFetchingNextPage ? <View style={{height: 80, justifyContent: 'center'}}><ActivityIndicator color={c.primary}/></View> : null}
          renderItem={({item, index}) => {
            const current = playback.station?.id === item.id; const active = current && isActive(playback.state);
            const art = Math.min(220, height * .34);
            return <View style={{height, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 12, alignItems: 'center', gap: 14}}>
              <View style={{alignSelf: 'stretch', height: art + 64, marginTop: 14}}>
                <View style={{position: 'absolute', left: 36, right: 36, top: -16, height: 80, borderRadius: 26, backgroundColor: c.accent + '30'}}/>
                <View style={{position: 'absolute', left: 18, right: 18, top: -8, height: 80, borderRadius: 26, backgroundColor: c.accent + '55'}}/>
                <View style={[cardStyle(c), {flex: 1, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingTop: 22, overflow: 'hidden', backgroundColor: c.featuredFallback, experimental_backgroundImage: c.featured} as ViewStyle]}>
                  <Artwork station={item} size={art}/>
                  <Label style={{position: 'absolute', top: 12, left: 16, fontSize: 11, letterSpacing: 2, color: '#D7DEF2', fontWeight: '700'}}>RADAR · {String(index + 1).padStart(2, '0')}</Label>
                </View>
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: c.border}}>
                <Label style={{fontSize: 14}}>{flag(item.countryCode)}</Label><Label style={{fontSize: 12, fontWeight: '700', color: c.primaryText, letterSpacing: 1}}>{(item.country || 'Mundo').toUpperCase()}</Label>
              </View>
              <View style={{alignItems: 'center', gap: 4}}>
                <Label numberOfLines={2} style={{fontSize: 26, lineHeight: 32, fontWeight: '800', textAlign: 'center'}}>{item.name}</Label>
                <Muted numberOfLines={1} style={{fontSize: 14}}>{[item.region, ...item.tags.slice(0, 2).map(tagLabel)].filter(Boolean).join(' · ') || item.language}</Muted>
              </View>
              <View style={{minHeight: 26, justifyContent: 'center'}}>{current && playback.state === 'playing' ? <LiveBadge/> : current ? <Muted style={{color: playback.state === 'error' ? c.live : c.muted}}>{playback.error ?? stateLabels[playback.state]}</Muted> : null}</View>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 28}}>
                <Favorite station={item} size={26}/>
                <PlayButton size={76} active={active} label={active ? 'Pausar ' + item.name : 'Sintonizar ' + item.name} onPress={() => current ? player.toggle() : player.select(item)}/>
                <IconButton icon="share-social-outline" plain label={'Compartir ' + item.name} onPress={() => {void Share.share({message: `${item.name} — ${item.homepage ?? item.streamUrl}`}).catch(() => {});}}/>
              </View>
              <View style={{flex: 1}}/>
              <View style={{alignItems: 'center', gap: 2}}>
                <Label accessibilityRole="button" onPress={() => {if (!current) player.select(item); router.push('/player');}} style={{fontSize: 13, color: c.primaryText, fontWeight: '600', padding: 8}}>Ver información de la emisora</Label>
                <Ionicons name="chevron-up" size={18} color={c.muted}/><Muted style={{fontSize: 12}}>Desliza para la siguiente emisora</Muted>
              </View>
            </View>;
          }}/>}
    </View>
  </View>;
}
