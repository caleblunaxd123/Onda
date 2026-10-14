import {Pressable, ScrollView, Text, View} from 'react-native';
import {router} from 'expo-router';
import {Ionicons} from '../../icons';
import {useTheme} from '../../theme';
import {flag, formatCount} from '../../format';
import type {CountryFacet} from '../../types';
import {Label, Muted} from '../../components/primitives';
import {SectionTitle} from '../../components/headers';

/** Rotating real destinations; stable for the day, independent of incoming facet order. */
export function dailyDestinations(countries: CountryFacet[], current: string, seed: number): CountryFacet[] {
  const rank = (code: string) => {
    let value = seed;
    for (const ch of code) {value = Math.imul(value ^ ch.charCodeAt(0), 16777619); value ^= value >>> 16;}
    return value >>> 0;
  };
  const unique = new Map(countries.filter(item => item.code !== current && item.count > 0).map(item => [item.code, item]));
  return [...unique.values()].sort((a, b) => b.count - a.count || a.code.localeCompare(b.code)).slice(0, 60)
    .sort((a, b) => rank(a.code) - rank(b.code) || a.code.localeCompare(b.code)).slice(0, 4);
}

export function DestinationShelf({countries, current, seed}: {countries: CountryFacet[]; current: string; seed: number}) {
  const c = useTheme(); const destinations = dailyDestinations(countries, current, seed);
  if (!destinations.length) return null;
  return <View style={{gap: 14}}>
    <SectionTitle title="Tu próxima parada" action="Ver países" onPress={() => router.push({pathname: '/search', params: {tab: 'countries'}})}/>
    <Muted>Un nuevo recorrido por el mundo cada día.</Muted>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 20, gap: 12}} style={{marginHorizontal: -20}}>
      {destinations.map((country, index) => <Pressable key={country.code} accessibilityRole="button" accessibilityLabel={`Explorar radios de ${country.name}`} onPress={() => router.push({pathname: '/search', params: {country: country.code}})}
        style={({pressed}) => ({width: 148, minHeight: 148, padding: 16, gap: 8, borderRadius: 22, backgroundColor: index % 2 ? c.accentSoft : c.surface, borderWidth: 1, borderColor: c.border, opacity: pressed ? .7 : 1})}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}><Text style={{fontSize: 34}}>{flag(country.code)}</Text><Ionicons name="arrow-forward" size={18} color={index % 2 ? c.accent : c.primaryText}/></View>
        <Label numberOfLines={2} style={{fontWeight: '800', fontSize: 16, lineHeight: 21}}>{country.name}</Label>
        <Muted style={{fontSize: 11}}>{formatCount(country.count)} radios</Muted>
      </Pressable>)}
    </ScrollView>
  </View>;
}
