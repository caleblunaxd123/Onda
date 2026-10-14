import type {PropsWithChildren, ReactNode} from 'react';
import {ScrollView, Text, View, type TextProps, type StyleProp, type ViewStyle} from 'react-native';
import {useTheme, type Palette} from '../theme';

export const cardStyle = (c: Palette): ViewStyle => ({backgroundColor: c.surface, borderRadius: 24, borderWidth: 1, borderColor: c.border, boxShadow: c.shadow} as ViewStyle);

export function Label({style, ...props}: TextProps) {const c = useTheme(); return <Text maxFontSizeMultiplier={1.6} {...props} style={[{color: c.text, fontSize: 15, lineHeight: 21}, style]}/>;}

export function Muted({style, ...props}: TextProps) {const c = useTheme(); return <Label {...props} style={[{color: c.muted, fontSize: 13, lineHeight: 18}, style]}/>;}

export function Page({children, refresh}: PropsWithChildren<{refresh?: ReactNode}>) {
  return <ScrollView style={{flex: 1}} contentContainerStyle={{paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 20}} keyboardShouldPersistTaps="handled">{refresh}{children}</ScrollView>;
}

export function Heading({children}: PropsWithChildren) {return <Label accessibilityRole="header" style={{fontSize: 24, lineHeight: 30, fontWeight: '800'}}>{children}</Label>;}

export function Card({children, style}: PropsWithChildren<{style?: StyleProp<ViewStyle>}>) {const c = useTheme(); return <View style={[cardStyle(c), {padding: 18, gap: 12}, style]}>{children}</View>;}
