import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, cancelAnimation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

/**
 * Decorative motion for the player. It is not an audio visualizer: ONDA does not analyse the stream, so the
 * animation only reflects the real player state (waves while the native player reports audio, a slow glow while
 * connecting) and stops completely when the system asks to reduce motion.
 */
export function SoundWaves({size, color, state}: {size: number; color: string; state: 'playing' | 'connecting' | 'idle'}) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return <View pointerEvents="none" style={{position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>
    <Glow size={size} color={color} active={state === 'connecting'}/>
    {[0, 1, 2].map(i => <Ring key={i} index={i} size={size} color={color} active={state === 'playing'}/>)}
  </View>;
}

function Ring({index, size, color, active}: {index: number; size: number; color: string; active: boolean}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (active) progress.value = withDelay(index * 900, withRepeat(withTiming(1, {duration: 2700, easing: Easing.out(Easing.quad)}), -1, false));
    else {cancelAnimation(progress); progress.value = withTiming(0, {duration: 250});}
    return () => cancelAnimation(progress);
  }, [active, index, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.12, 1], [0, 0.5, 0]),
    transform: [{scale: interpolate(progress.value, [0, 1], [1, 1.42])}],
  }));
  return <Animated.View style={[{position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color}, style]}/>;
}

function Glow({size, color, active}: {size: number; color: string; active: boolean}) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (active) pulse.value = withRepeat(withSequence(withTiming(1, {duration: 900}), withTiming(0, {duration: 900})), -1, false);
    else {cancelAnimation(pulse); pulse.value = withTiming(0, {duration: 250});}
    return () => cancelAnimation(pulse);
  }, [active, pulse]);
  const style = useAnimatedStyle(() => ({opacity: pulse.value * 0.35, transform: [{scale: 1 + pulse.value * 0.08}]}));
  return <Animated.View style={[{position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color}, style]}/>;
}

/** Small animated bars shown next to "EN VIVO"; static when motion is reduced or audio is not playing. */
export function Equalizer({color, active, height = 14}: {color: string; active: boolean; height?: number}) {
  const reduce = useReducedMotion();
  return <View accessible={false} style={{flexDirection: 'row', alignItems: 'flex-end', gap: 2, height}}>
    {[520, 380, 610, 450].map((duration, i) => <Bar key={i} duration={duration} color={color} height={height} active={active && !reduce}/>)}
  </View>;
}

function Bar({duration, color, height, active}: {duration: number; color: string; height: number; active: boolean}) {
  const level = useSharedValue(0.35);
  useEffect(() => {
    if (active) level.value = withRepeat(withSequence(withTiming(1, {duration}), withTiming(0.25, {duration: duration * 0.8}), withTiming(0.7, {duration: duration * 0.6})), -1, true);
    else {cancelAnimation(level); level.value = withTiming(0.35, {duration: 200});}
    return () => cancelAnimation(level);
  }, [active, duration, level]);
  const style = useAnimatedStyle(() => ({height: Math.max(3, height * level.value)}));
  return <Animated.View style={[{width: 3, borderRadius: 2, backgroundColor: color}, style]}/>;
}

const WAVE_PATTERN = [0.25, 0.4, 0.3, 0.55, 0.45, 0.7, 0.5, 0.85, 0.65, 1, 0.75, 0.9, 0.6, 0.8, 0.5, 0.65, 0.4, 0.55, 0.3, 0.35];

/**
 * Decorative brand waveform for headers (cyan → blue → violet, like the logo). Static by default; it breathes
 * only while the global player reports real playback, and never moves when the system reduces motion.
 */
export function Waveform({active, height = 44, bars = WAVE_PATTERN.length, opacity = 0.45}: {active: boolean; height?: number; bars?: number; opacity?: number}) {
  const reduce = useReducedMotion();
  const colors = ['#12D3E6', '#1BA8E4', '#1478E0', '#3F5BE8', '#6D3BEF'];
  return <View pointerEvents="none" accessible={false} style={{flexDirection: 'row', alignItems: 'center', gap: 3, height, opacity}}>
    {WAVE_PATTERN.slice(0, bars).map((level, i) => <WaveBar key={i} level={level} height={height} index={i}
      color={colors[Math.min(colors.length - 1, Math.floor(i / bars * colors.length))]} active={active && !reduce}/>)}
  </View>;
}

function WaveBar({level, height, index, color, active}: {level: number; height: number; index: number; color: string; active: boolean}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (active) scale.value = withDelay(index * 60, withRepeat(withSequence(withTiming(0.55, {duration: 420 + (index % 4) * 90}), withTiming(1.1, {duration: 380 + (index % 3) * 110})), -1, true));
    else {cancelAnimation(scale); scale.value = withTiming(1, {duration: 200});}
    return () => cancelAnimation(scale);
  }, [active, index, scale]);
  const style = useAnimatedStyle(() => ({height: Math.max(4, height * level * scale.value)}));
  return <Animated.View style={[{width: 3.5, borderRadius: 2, backgroundColor: color}, style]}/>;
}
