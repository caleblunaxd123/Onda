import {View} from 'react-native';
import {gradientStyle, useTheme} from './theme';

/** Static ONDA waves: no images, blur, autoplay or continuous animation. */
export function OndaAmbientBackground() {
  const c = useTheme();
  if (!c.immersive) return null;
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <View style={{position: 'absolute', inset: 0, ...gradientStyle('linear-gradient(155deg, #07112C 0%, #12163D 55%, #1B123A 100%)')}}/>
    <View style={{position: 'absolute', right: '-45%', top: -150, width: '140%', height: 520, opacity: .6, ...gradientStyle('radial-gradient(ellipse at center, #6233D4 0%, #186BFF30 48%, transparent 72%)')}}/>
    <View style={{position: 'absolute', left: '-70%', top: '42%', width: '130%', height: 520, opacity: .3, ...gradientStyle('radial-gradient(ellipse at center, #0DBAD8 0%, #137DED22 48%, transparent 72%)')}}/>
    <View style={{position: 'absolute', left: '-20%', top: '38%', width: '150%', height: 160, borderRadius: 250, borderTopWidth: 1, borderColor: '#56DEFF38', transform: [{rotate: '-18deg'}], ...gradientStyle('linear-gradient(180deg, #186BFF16 0%, transparent 90%)')}}/>
  </View>;
}
