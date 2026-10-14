import {View} from 'react-native';
import {Ionicons} from '../../icons';
import {useTheme} from '../../theme';
import {Label, Muted} from '../../components/primitives';
import type {IconName} from '../../components/types';

export function LibraryOverview({favorites, collections, countries}: {favorites: number; collections: number; countries: number}) {
  const c = useTheme();
  const stats: {icon: IconName; value: number; label: string; tint: string}[] = [
    {icon: 'heart', value: favorites, label: 'Favoritas', tint: c.live},
    {icon: 'albums', value: collections, label: 'Colecciones', tint: c.accent},
    {icon: 'earth', value: countries, label: 'Países', tint: c.primaryText},
  ];
  return <View style={{flexDirection: 'row', backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, paddingVertical: 14}}>
    {stats.map((stat, index) => <View key={stat.label} style={{flex: 1, alignItems: 'center', gap: 4, borderRightWidth: index < 2 ? 1 : 0, borderColor: c.border}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}><Ionicons name={stat.icon} size={16} color={stat.tint}/><Label style={{fontSize: 21, lineHeight: 26, fontWeight: '800'}}>{stat.value}</Label></View><Muted style={{fontSize: 11}}>{stat.label}</Muted>
    </View>)}
  </View>;
}
