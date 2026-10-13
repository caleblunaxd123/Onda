import {ActivityIndicator, Pressable, Text, View} from 'react-native';
import {router} from 'expo-router';
import {Ionicons} from '../icons';
import {useTheme} from '../theme';
import {useLibrary} from '../library';
import {isActive, player, usePlayer} from '../player';
import type {Station} from '../types';
import {Equalizer} from '../waves';
import {Label, Muted, cardStyle} from './primitives';
import {Artwork} from './artwork';
import {PlayButton} from './controls';

export const stateLabels = {idle: 'Elige una emisora', connecting: 'Conectando…', buffering: 'Cargando audio…', playing: 'En vivo', paused: 'En pausa', error: 'Sin reproducción'};

export function LiveBadge({small}: {small?: boolean}) {
  const c = useTheme();
  return <View accessibilityLabel="En vivo: reproduciendo" style={{flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.live, borderRadius: 99, paddingHorizontal: small ? 7 : 10, paddingVertical: small ? 2 : 4}}>
    <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF'}}/><Text style={{color: '#FFFFFF', fontSize: small ? 10 : 11, fontWeight: '800', letterSpacing: .5}}>EN VIVO</Text>
  </View>;
}

/** Real playback status for a station: EN VIVO only when the native player reports audio. */
export function StationStatus({station}: {station: Station}) {
  const c = useTheme(); const s = usePlayer();
  if (s.station?.id !== station.id) return null;
  if (s.state === 'playing') return <LiveBadge small/>;
  if (s.state === 'connecting' || s.state === 'buffering') return <ActivityIndicator size="small" color={c.primary} accessibilityLabel={stateLabels[s.state]}/>;
  return null;
}

export function Favorite({station, size = 22, tint}: {station: Station; size?: number; tint?: string}) {
  const c = useTheme(); const favorites = useLibrary(s => s.favorites); const toggle = useLibrary(s => s.toggle); const selected = favorites.some(s => s.id === station.id);
  return <Pressable accessibilityRole="button" accessibilityLabel={selected ? 'Quitar de favoritos' : 'Añadir a favoritos'} accessibilityState={{selected}} onPress={() => toggle(station)} hitSlop={4} style={{minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center'}}><Ionicons name={selected ? 'heart' : 'heart-outline'} size={size} color={selected ? c.live : tint ?? c.muted}/></Pressable>;
}

export function MiniPlayer() {
  const c = useTheme(); const s = usePlayer(); if (!s.station) return null;
  const active = isActive(s.state);
  return <View style={[cardStyle(c), {marginHorizontal: 10, marginBottom: 6, padding: 8, paddingLeft: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18}]}>
    <Pressable onPress={() => router.push('/player')} accessibilityRole="button" accessibilityLabel={'Abrir reproductor: ' + s.station.name} style={{flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center'}}>
      <Artwork key={s.station.id} station={s.station} size={42}/>
      <View style={{flex: 1}}>
        <Label numberOfLines={1} style={{fontWeight: '700', fontSize: 14}}>{s.station.name}</Label>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>{s.state === 'playing' && !s.error ? <><Equalizer color={c.live} active height={12}/><LiveBadge small/></> : null}<Muted numberOfLines={1} style={{fontSize: 12, color: s.state === 'error' ? c.live : c.muted, flex: 1}}>{s.error ?? (s.state === 'playing' ? [s.station.country, s.station.region].filter(Boolean).join(' · ') : stateLabels[s.state])}</Muted></View>
      </View>
    </Pressable>
    <Favorite station={s.station}/>
    <PlayButton active={active} onPress={player.toggle} label={active ? 'Pausar' : 'Escuchar'}/>
  </View>;
}
