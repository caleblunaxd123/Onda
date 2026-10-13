import {useMemo} from 'react';
import {FlatList, Pressable, View} from 'react-native';
import {router} from 'expo-router';
import {useLibrary, uniqueBroadcasts} from '../src/library';
import {useTheme} from '../src/theme';
import {Ionicons} from '../src/icons';
import {Card, EmptyState, Label, Muted, ScreenHeader, flag} from '../src/ui';
export default function Passport() {
  const c = useTheme(); const history = useLibrary(s => s.history);
  const countries = useMemo(() => {
    const map = new Map<string, {code: string; name: string; stations: string[]}>();
    for (const station of uniqueBroadcasts(history)) {
      if (!station.countryCode) continue;
      const country = map.get(station.countryCode) ?? {code: station.countryCode, name: station.country, stations: []};
      country.stations.push(station.name); map.set(country.code, country);
    }
    return [...map.values()].sort((a, b) => b.stations.length - a.stations.length || a.name.localeCompare(b.name, 'es'));
  }, [history]);
  const badge = countries.length >= 25 ? 'Ciudadano del mundo' : countries.length >= 10 ? 'Viajero sonoro' : countries.length >= 3 ? 'Explorador' : 'Primeras frecuencias';
  return <View style={{flex: 1, backgroundColor: c.bg}}><ScreenHeader title="Tu pasaporte sonoro" back/><FlatList data={countries} keyExtractor={item => item.code} contentContainerStyle={{padding: 20, gap: 14}}
    ListHeaderComponent={<Card style={{backgroundColor: c.accentSoft, alignItems: 'center', padding: 24}}><Ionicons name="planet-outline" size={48} color={c.accent}/><Label style={{fontSize: 34, lineHeight: 42, fontWeight: '900'}}>{countries.length}</Label><Label style={{fontWeight: '800'}}>países en tu historial</Label><Muted>{badge}</Muted><Muted style={{textAlign: 'center'}}>Cada emisora que escuchas abre una ventana al mundo.</Muted></Card>}
    ListEmptyComponent={<EmptyState icon="earth-outline" title="Tu primer destino te espera" body="Escucha una radio. Los países de las emisoras que produzcan audio aparecerán aquí."/>}
    ListFooterComponent={<Muted style={{textAlign: 'center', paddingVertical: 20}}>Basado en las últimas emisoras de tu historial. Tu ubicación personal no se registra.</Muted>}
    renderItem={({item}) => <Pressable accessibilityRole="button" accessibilityLabel={`Seguir explorando ${item.name}`} onPress={() => router.push({pathname: '/search', params: {country: item.code}})} style={({pressed}) => ({backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center', opacity: pressed ? .7 : 1})}><Label style={{fontSize: 34, lineHeight: 42}}>{flag(item.code)}</Label><View style={{flex: 1, gap: 4}}><Label style={{fontWeight: '800', fontSize: 18}}>{item.name}</Label><Muted>{item.stations.length} {item.stations.length === 1 ? 'emisora escuchada' : 'emisoras escuchadas'}</Muted><Muted numberOfLines={1}>{item.stations.slice(0, 2).join(' · ')}</Muted></View><Ionicons name="arrow-forward" size={20} color={c.primaryText}/></Pressable>}/></View>;
}
