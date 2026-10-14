import {useState} from 'react';
import {Image, View} from 'react-native';
import {useTheme} from '../theme';
import type {Station} from '../types';
import {Label} from './primitives';

export function Artwork({station, size = 64, round = false}: {station: Station; size?: number; round?: boolean}) {
  const c = useTheme(); const [failed, setFailed] = useState(false);
  const hue = [...station.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 4;
  const tint = [c.primary, c.accent, '#E58A13', '#E5487E'][hue];
  return <View style={{width: size, height: size, borderRadius: round ? size / 2 : Math.min(18, size / 4), backgroundColor: station.artworkUrl && !failed ? '#FFFFFF' : tint + '22', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: c.border}}>
    {station.artworkUrl && !failed ? <Image accessibilityLabel={'Logo de ' + station.name} source={{uri: station.artworkUrl}} resizeMode="contain" style={{width: size, height: size}} onError={() => setFailed(true)}/>
      : <Label style={{fontSize: size * .34, lineHeight: size * .42, fontWeight: '800', color: tint}}>{initials(station.name)}</Label>}
  </View>;
}

const initials = (name: string) => name.replace(/[^\p{L}\p{N} ]/gu, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '♪';
