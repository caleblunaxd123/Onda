import {useEffect, useState, type PropsWithChildren} from 'react';
import {AccessibilityInfo, Pressable, View, type PressableProps, type StyleProp, type ViewStyle} from 'react-native';
import Animated, {FadeInDown, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming} from 'react-native-reanimated';
import {gradientStyle, useTheme} from '../theme';
import {Ionicons} from '../icons';
import type {IconName} from './types';
import {Label, Muted} from './primitives';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
/** Lightweight native gradients, no bitmaps, blur or perpetual animation. */
export function OndaAmbientBackground({context = 'social'}: {context?: 'social' | 'radio' | 'music'}) {
  const c = useTheme();
  const magenta = context === 'radio' ? '#087FAD' : '#ED37CE';
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: c.bg}}>
    <View style={{position: 'absolute', inset: 0, ...gradientStyle(c.isDark ? 'linear-gradient(160deg, #07112C 0%, #101441 52%, #180F36 100%)' : 'linear-gradient(155deg, #EBF7FC 0%, #F6EEFF 55%, #F5F8FC 100%)')}}/>
    <View style={{position: 'absolute', right: '-35%', top: -160, width: '125%', height: 440, opacity: c.isDark ? .75 : .22,
      ...gradientStyle('radial-gradient(ellipse at center, #6532DB 0%, #186BFF44 45%, transparent 70%)')}}/>
    <View style={{position: 'absolute', left: '-60%', top: '36%', width: '120%', height: 500, opacity: c.isDark ? .36 : .12,
      ...gradientStyle(`radial-gradient(ellipse at center, ${magenta} 0%, ${magenta}55 40%, transparent 70%)`)}}/>
    <View style={{position: 'absolute', right: '-20%', bottom: -210, width: '125%', height: 430, opacity: c.isDark ? .5 : .14,
      ...gradientStyle('radial-gradient(ellipse at center, #186BFF 0%, #11DDF422 50%, transparent 70%)')}}/>
    <View style={{position: 'absolute', left: '-20%', top: '30%', width: '140%', height: 130, borderRadius: 200, borderTopWidth: 1, borderColor: c.isDark ? '#11DDF430' : '#783BFF20', transform: [{rotate: '-21deg'}],
      ...gradientStyle('linear-gradient(180deg, #186BFF15 0%, transparent 80%)')}}/>
  </View>;
}
export function useOndaReducedMotion() {
  const startup = useReducedMotion(); const [reduced, setReduced] = useState(startup);
  useEffect(() => {void AccessibilityInfo.isReduceMotionEnabled().then(setReduced); const change = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced); return () => change.remove();}, []);
  return reduced;
}
export function OndaPressable({style, onPressIn, onPressOut, ...props}: PressableProps & {style?: StyleProp<ViewStyle>}) {
  const scale = useSharedValue(1); const reduced = useOndaReducedMotion();
  const motion = useAnimatedStyle(() => ({transform: [{scale: scale.value}]}));
  return <AnimatedPressable {...props} style={[style, motion]} onPressIn={event => {if (!reduced) scale.set(withTiming(.975, {duration: 100, reduceMotion: ReduceMotion.System})); onPressIn?.(event);}}
    onPressOut={event => {scale.set(withTiming(1, {duration: 160, reduceMotion: ReduceMotion.System})); onPressOut?.(event);}}/>;
}
export function OndaMotionCard({children, index = 0, style}: PropsWithChildren<{index?: number; style?: StyleProp<ViewStyle>}>) {
  const reduced = useOndaReducedMotion();
  return <Animated.View entering={reduced ? undefined : FadeInDown.duration(220).delay(Math.min(index * 35, 140)).reduceMotion(ReduceMotion.System)} style={style}>{children}</Animated.View>;
}
export function OndaGlassSurface({children, style}: PropsWithChildren<{style?: StyleProp<ViewStyle>}>) {
  const c = useTheme();
  return <View style={[{backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 24, padding: 18, gap: 12}, style]}>{children}</View>;
}
export function OndaGradientButton({title, onPress, icon, disabled, compact = false}: {title: string; onPress: () => void; icon?: IconName; disabled?: boolean; compact?: boolean}) {
  const c = useTheme();
  return <OndaPressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    style={{minHeight: compact ? 44 : 52, paddingHorizontal: compact ? 14 : 20, paddingVertical: 10, borderRadius: compact ? 16 : 20, gap: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', opacity: disabled ? .45 : 1,
      borderWidth: 1, borderColor: '#87C8FF60', boxShadow: disabled ? 'none' : '0px 4px 18px rgba(85, 60, 255, .28)', ...gradientStyle(c.brand, c.primary)}}>
    {icon && <Ionicons name={icon} size={compact ? 18 : 22} color="#FFFFFF"/>}<Label style={{color: '#FFFFFF', fontWeight: '800', fontSize: compact ? 13 : 15, textAlign: 'center'}}>{title}</Label>
  </OndaPressable>;
}
export function OndaCategoryTile({title, note, icon, color, onPress, disabled, selected}: {title: string; note?: string; icon: IconName; color: string; onPress: () => void; disabled?: boolean; selected?: boolean}) {
  const c = useTheme();
  return <OndaPressable accessibilityRole="button" accessibilityLabel={title + (note ? ', ' + note : '')} accessibilityState={{disabled, selected}} disabled={disabled} onPress={onPress}
    style={{flex: 1, minHeight: 115, borderRadius: 22, padding: 15, gap: 12, borderWidth: selected ? 2 : 1, borderColor: selected ? c.primaryText : color + '85', overflow: 'hidden', opacity: disabled ? .5 : 1,
      ...gradientStyle(`linear-gradient(125deg, ${c.isDark ? '#111A3F' : '#FFFFFF'} 12%, ${color}${c.isDark ? '48' : '24'} 100%)`, c.surface)}}>
    <View pointerEvents="none" style={{position: 'absolute', right: -8, bottom: -12, opacity: .13, transform: [{rotate: '-12deg'}]}}><Ionicons name={icon} size={95} color={color}/></View>
    <View style={{width: 42, height: 42, borderRadius: 14, backgroundColor: color + '22', justifyContent: 'center', alignItems: 'center'}}><Ionicons name={icon} size={27} color={c.isDark ? color : c.primaryText}/></View>
    <View style={{flexDirection: 'row', gap: 4, alignItems: 'center'}}><View style={{flex: 1, gap: 3}}><Label style={{fontSize: 16, fontWeight: '800'}}>{title}</Label>{note && <Muted style={{fontSize: 11}}>{note}</Muted>}</View><Ionicons name="chevron-forward" size={16} color={c.muted}/></View>
  </OndaPressable>;
}
export function OndaSkeleton() {
  const c = useTheme(); return <View accessibilityRole="progressbar" accessibilityLabel="Cargando salas" style={{gap: 14}}>{[0,1].map(id => <OndaGlassSurface key={id} style={{height: 225}}><View style={{flex: 1, borderRadius: 16, backgroundColor: c.surfaceAlt}}/><View style={{height: 12, width: '65%', borderRadius: 6, backgroundColor: c.surfaceAlt}}/></OndaGlassSurface>)}</View>;
}
export function OndaReactionOverlay({emoji}: {emoji: string}) {
  const y = useSharedValue(0); const opacity = useSharedValue(0); const reduced = useOndaReducedMotion();
  useEffect(() => {if (!emoji) {opacity.value = 0; return;} y.value = 0; opacity.value = 1;
    if (!reduced) y.value = withTiming(-90, {duration: 1400, reduceMotion: ReduceMotion.System});
    opacity.value = withTiming(0, {duration: reduced ? 1200 : 1600, reduceMotion: reduced ? ReduceMotion.Never : ReduceMotion.System});
  }, [emoji, opacity, reduced, y]);
  const style = useAnimatedStyle(() => ({opacity: opacity.value, transform: [{translateY: y.value}]}));
  return <Animated.View pointerEvents="none" style={[{position: 'absolute', bottom: 20, right: 22, zIndex: 5}, style]}><Label style={{fontSize: 44, lineHeight: 56}}>{emoji}</Label></Animated.View>;
}
