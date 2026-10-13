import {useState} from 'react';
import {Pressable, Share, View} from 'react-native';
import {router} from 'expo-router';
import {Ionicons} from '../icons';
import {useTheme} from '../theme';
import {player} from '../player';
import type {StationQueue} from '../player-engine';
import type {Station} from '../types';
import {Label, Muted} from './primitives';
import {CollectionPicker} from './collections';
import {Sheet} from './sheets';
import type {IconName} from './types';

/** Actions for a station: collections, sharing, details. */
export function StationActions({station, onClose, onRemove, queue}: {station: Station; onClose: () => void; onRemove?: () => void; queue?: StationQueue}) {
  const [picker, setPicker] = useState(false);
  if (picker) return <CollectionPicker station={station} onClose={onClose}/>;
  const share = () => {onClose(); void Share.share({message: `${station.name} — ${station.homepage ?? station.streamUrl}`}).catch(() => {});};
  return <Sheet title={station.name} onClose={onClose}>
    <ActionRow icon="play-circle-outline" label="Escuchar ahora" onPress={() => {onClose(); player.select(station, queue);}}/>
    <ActionRow icon="albums-outline" label="Guardar en una colección" onPress={() => setPicker(true)}/>
    <ActionRow icon="people-outline" label="Escuchar juntos en una sala" onPress={() => {onClose(); router.push({pathname: '/create-room', params: {stationId: station.id}});}}/>
    {onRemove && <ActionRow icon="remove-circle-outline" label="Quitar de esta colección" onPress={() => {onClose(); onRemove();}}/>}
    <ActionRow icon="share-social-outline" label="Compartir emisora" onPress={share}/>
    <ActionRow icon="information-circle-outline" label="Abrir en el reproductor" onPress={() => {onClose(); player.select(station, queue); router.push('/player');}}/>
  </Sheet>;
}

export function ActionRow({icon, label, detail, onPress}: {icon: IconName; label: string; detail?: string; onPress: () => void}) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed}) => ({minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4, opacity: pressed ? .6 : 1})}>
    <View style={{width: 36, height: 36, borderRadius: 12, backgroundColor: c.primary + '18', alignItems: 'center', justifyContent: 'center'}}><Ionicons name={icon} size={20} color={c.primaryText}/></View>
    <Label style={{flex: 1, fontWeight: '600'}}>{label}</Label>{detail ? <Muted>{detail}</Muted> : null}<Ionicons name="chevron-forward" size={18} color={c.muted}/>
  </Pressable>;
}
