import {useState} from 'react';
import {Pressable, View, type ViewStyle} from 'react-native';
import {Ionicons} from '../icons';
import {useTheme} from '../theme';
import {player} from '../player';
import type {StationQueue} from '../player-engine';
import type {Station} from '../types';
import {flag, tagLabel} from '../format';
import {Label, Muted} from './primitives';
import {Artwork} from './artwork';
import {Favorite, StationStatus} from './playback';
import {IconButton} from './controls';
import {StationActions} from './station-actions';

const subtitleFor = (station: Station) => [station.region || station.country, station.tags[0] ? tagLabel(station.tags[0]) : station.codec].filter(Boolean).join(' · ');

export function StationRow({station, onRemove, onPress, selected, card, queue}: {station: Station; onRemove?: () => void; onPress?: () => void; selected?: boolean; card?: boolean; queue?: StationQueue}) {
  const c = useTheme(); const [menu, setMenu] = useState(false);
  return <View style={[{flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6, paddingHorizontal: selected || card ? 8 : 0, borderRadius: 18, backgroundColor: selected ? c.primary + '14' : 'transparent'},
    card && !selected && {backgroundColor: c.surface, boxShadow: c.shadow, marginBottom: 8, paddingVertical: 8} as ViewStyle, card && selected && {marginBottom: 8, paddingVertical: 8, borderWidth: 1, borderColor: c.primary + '55'}]}>
    <Pressable accessibilityRole="button" accessibilityLabel={(onPress ? 'Seleccionar ' : 'Escuchar ') + station.name} onPress={onPress ?? (() => player.select(station, queue))} style={({pressed}) => ({flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center', opacity: pressed ? .7 : 1})}>
      <Artwork key={station.id} station={station} size={50}/>
      <View style={{flex: 1, gap: 2}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}><Label numberOfLines={1} style={{fontWeight: '700', flexShrink: 1}}>{station.name}</Label><StationStatus station={station}/></View>
        <Muted numberOfLines={1}>{flag(station.countryCode)} {subtitleFor(station)}</Muted>
      </View>
    </Pressable>
    <Favorite station={station}/>
    <IconButton icon="ellipsis-vertical" plain label={'Más opciones de ' + station.name} onPress={() => setMenu(true)}/>
    {menu && <StationActions station={station} queue={queue} onClose={() => setMenu(false)} onRemove={onRemove}/>}
  </View>;
}

export function StationTile({station, queue}: {station: Station; queue?: StationQueue}) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={'Escuchar ' + station.name} onPress={() => player.select(station, queue)} style={({pressed}) => ({width: 116, gap: 6, opacity: pressed ? .75 : 1})}>
    <View><Artwork station={station} size={116}/><View style={{position: 'absolute', bottom: 8, right: 8, backgroundColor: c.surface, borderRadius: 99, padding: 7, boxShadow: c.shadow} as ViewStyle}><Ionicons name="play" size={14} color={c.primaryText}/></View><View style={{position: 'absolute', top: 8, left: 8}}><StationStatus station={station}/></View></View>
    <Label numberOfLines={1} style={{fontSize: 13, lineHeight: 18, fontWeight: '700'}}>{station.name}</Label>
    <Muted numberOfLines={1} style={{fontSize: 12, lineHeight: 16}}>{flag(station.countryCode)} {station.country}</Muted>
  </Pressable>;
}
