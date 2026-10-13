import type {PropsWithChildren} from 'react';
import {Image, Pressable, Text, View, type ViewStyle} from 'react-native';
import {router} from 'expo-router';
import {useTheme} from '../theme';
import {usePlayer} from '../player';
import {Waveform} from '../waves';
import {Label, Muted} from './primitives';
import {IconButton} from './controls';

/** Consistent screen header: large title, optional subtitle, back button for stacked screens and trailing actions. */
export function ScreenHeader({title, subtitle, back, children}: PropsWithChildren<{title: string; subtitle?: string; back?: boolean}>) {
  const c = useTheme();
  return <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, backgroundColor: c.bg}}>
    {back && <IconButton icon="chevron-back" label="Volver" plain onPress={() => router.canGoBack() ? router.back() : router.replace('/')}/>}
    <View style={{flex: 1}}>
      <Label accessibilityRole="header" numberOfLines={1} style={{fontSize: back ? 20 : 26, lineHeight: back ? 26 : 32, fontWeight: '800', letterSpacing: -0.3}}>{title}</Label>
      {subtitle ? <Muted numberOfLines={1}>{subtitle}</Muted> : null}
    </View>
    {children}
  </View>;
}

const logo = require('../../assets/brand/onda-logo-header.png');

/** Tab screen header from the owner's model: ONDA logo, brand waveform, optional title and trailing actions. */
export function BrandHeader({title, subtitle, emoji, children}: PropsWithChildren<{title?: string; subtitle?: string; emoji?: string}>) {
  const c = useTheme(); const playback = usePlayer();
  return <View style={{paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, backgroundColor: c.bg, experimental_backgroundImage: c.headerGlow} as ViewStyle}>
    <View pointerEvents="none" style={{position: 'absolute', right: 70, top: 6}}><Waveform active={playback.state === 'playing'} height={46} opacity={c.isDark ? 0.55 : 0.4}/></View>
    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48}}>
      <Image source={logo} accessibilityRole="header" accessibilityLabel="ONDA" resizeMode="contain" style={{width: 128, height: 36}}/>
      <View style={{flexDirection: 'row', gap: 8}}>{children}</View>
    </View>
    {title ? <View style={{marginTop: 6}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
        <Label accessibilityRole="header" numberOfLines={1} style={{fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.5, flexShrink: 1}}>{title}</Label>
        {emoji ? <Text style={{fontSize: 24}}>{emoji}</Text> : null}
      </View>
      {subtitle ? <Muted numberOfLines={2} style={{fontSize: 13.5, lineHeight: 18}}>{subtitle}</Muted> : null}
    </View> : null}
  </View>;
}

export function SectionTitle({title, action, onPress}: {title: string; action?: string; onPress?: () => void}) {
  const c = useTheme();
  return <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: -6}}><Label accessibilityRole="header" style={{fontSize: 18, lineHeight: 24, fontWeight: '800', flex: 1}}>{title}</Label>{action && <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={{minHeight: 44, justifyContent: 'center'}}><Label style={{fontSize: 13, fontWeight: '600', color: c.primaryText}}>{action}</Label></Pressable>}</View>;
}
