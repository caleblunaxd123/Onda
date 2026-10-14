import {useState} from 'react';
import {Pressable, TextInput, View, type ViewStyle} from 'react-native';
import {Ionicons} from '../icons';
import {gradientStyle, useTheme} from '../theme';
import {OndaGradientButton} from './experience';
import {Label} from './primitives';
import type {IconName} from './types';

export function Button({title, onPress, secondary = false, icon, disabled}: {title: string; onPress: () => void; secondary?: boolean; icon?: IconName; disabled?: boolean}) {
  const c = useTheme();
  if (!secondary) return <OndaGradientButton title={title} onPress={onPress} icon={icon} disabled={disabled}/>;
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed}) => ({minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, backgroundColor: secondary ? c.surfaceAlt : c.primary, opacity: disabled ? .5 : pressed ? .75 : 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8})}>
    {icon && <Ionicons name={icon} size={18} color={secondary ? c.text : c.onPrimary}/>}<Label style={{color: secondary ? c.text : c.onPrimary, fontWeight: '700', textAlign: 'center'}}>{title}</Label>
  </Pressable>;
}

/** Selectable pill, as in the reference search filters. */
export function Chip({label, selected, onPress, icon, onRemove}: {label: string; selected?: boolean; onPress?: () => void; icon?: IconName; onRemove?: () => void}) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{selected}} accessibilityLabel={onRemove ? `Quitar filtro ${label}` : label} onPress={onRemove ?? onPress}
    style={({pressed}) => ({minHeight: 38, paddingHorizontal: 14, borderRadius: 99, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? .7 : 1,
      ...(selected ? gradientStyle(c.brand, c.primary) : {backgroundColor: c.surface}), borderWidth: 1, borderColor: selected ? '#87C8FF80' : c.border})}>
    {icon && <Ionicons name={icon} size={15} color={selected ? c.onPrimary : c.muted}/>}
    <Label numberOfLines={1} style={{fontSize: 13, fontWeight: '600', color: selected ? c.onPrimary : c.text, maxWidth: 200}}>{label}</Label>
    {onRemove && <Ionicons name="close" size={15} color={selected ? c.onPrimary : c.muted}/>}
  </Pressable>;
}

export function SearchField({value, onChange, placeholder, label, onSubmit, autoFocus}: {value: string; onChange: (v: string) => void; placeholder: string; label: string; onSubmit?: () => void; autoFocus?: boolean}) {
  const c = useTheme(); const [focused, setFocused] = useState(false);
  return <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: focused ? c.primaryText : c.border, paddingHorizontal: 16, boxShadow: focused ? '0px 0px 14px rgba(17, 221, 244, .12)' : 'none'}}>
    <Ionicons name="search" size={18} color={c.muted}/>
    <TextInput accessibilityLabel={label} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} autoFocus={autoFocus} placeholder={placeholder} placeholderTextColor={c.muted} value={value} onChangeText={onChange} onSubmitEditing={onSubmit} returnKeyType="search" autoCorrect={false} style={{flex: 1, minHeight: 52, color: c.text, fontSize: 15}}/>
    {value ? <Pressable accessibilityRole="button" accessibilityLabel="Borrar texto" onPress={() => onChange('')} hitSlop={8}><Ionicons name="close-circle" size={20} color={c.muted}/></Pressable> : null}
  </View>;
}

export function PlayButton({active, onPress, label, size = 44}: {active: boolean; onPress: () => void; label: string; size?: number}) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({pressed}) => ({width: size, height: size, borderRadius: size / 2, ...gradientStyle(c.brand, c.primary), alignItems: 'center', justifyContent: 'center', opacity: pressed ? .75 : 1, boxShadow: `0px 6px 16px ${c.primary}55`} as ViewStyle)}>
    <Ionicons name={active ? 'pause' : 'play'} size={size * .45} color="#FFFFFF" style={{marginLeft: active ? 0 : size * .05}}/>
  </Pressable>;
}

export function IconButton({icon, label, onPress, large = false, plain = false, tint, disabled = false}: {icon: IconName; label: string; onPress: () => void; large?: boolean; plain?: boolean; tint?: string; disabled?: boolean}) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} hitSlop={4} style={({pressed}) => ({width: large ? 72 : 44, height: large ? 72 : 44, borderRadius: 99, ...(large ? gradientStyle(c.brand, c.primary) : {backgroundColor: plain ? 'transparent' : c.surface}), alignItems: 'center', justifyContent: 'center', opacity: disabled ? .3 : pressed ? .6 : 1, borderWidth: large || plain ? 0 : 1, borderColor: c.border})}>
    <Ionicons name={icon} size={large ? 34 : 22} color={tint ?? (large ? c.onPrimary : c.text)}/>
  </Pressable>;
}
