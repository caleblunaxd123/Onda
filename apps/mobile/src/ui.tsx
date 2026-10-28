import { PropsWithChildren, ReactNode, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, Text, TextInput, TextProps, View, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from './icons';
import { gradientStyle, useTheme, type Palette } from './theme';
import { useLibrary } from './library';
import { isActive, player, usePlayer } from './player';
import type { Station } from './types';
import { Equalizer, Waveform } from './waves';
import {useDesktop} from './web/layout';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
export const stateLabels = {idle: 'Elige una emisora', connecting: 'Conectando…', buffering: 'Cargando audio…', playing: 'En vivo', paused: 'En pausa', error: 'Sin reproducción'};

export const cardStyle = (c: Palette): ViewStyle => ({backgroundColor: c.surface, borderRadius: 20, borderWidth: c.immersive ? 1 : 0, borderColor: c.border, boxShadow: c.shadow} as ViewStyle);

export function Label({style, ...props}: TextProps) {const c = useTheme(); return <Text maxFontSizeMultiplier={1.6} {...props} style={[{color: c.text, fontSize: 15, lineHeight: 21}, style]}/>;}
export function Muted({style, ...props}: TextProps) {const c = useTheme(); return <Label {...props} style={[{color: c.muted, fontSize: 13, lineHeight: 18}, style]}/>;}

export function Page({children, refresh}: PropsWithChildren<{refresh?: ReactNode}>) {
  const desktop = useDesktop();
  return <ScrollView style={{flex: 1, backgroundColor: 'transparent'}} contentContainerStyle={{paddingHorizontal: desktop ? 36 : 20, paddingTop: desktop ? 24 : 8, paddingBottom: 32, gap: 20, ...(desktop ? {maxWidth: 1100, width: '100%', alignSelf: 'center'} as const : {})}} keyboardShouldPersistTaps="handled">{refresh}{children}</ScrollView>;
}
export function Heading({children}: PropsWithChildren) {return <Label accessibilityRole="header" style={{fontSize: 24, lineHeight: 30, fontWeight: '800'}}>{children}</Label>;}

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

const logo = require('../assets/brand/onda-logo-header.png');

/** Tab screen header from the owner's model: ONDA logo, brand waveform, optional title and trailing actions. */
export function BrandHeader({title, subtitle, emoji, children}: PropsWithChildren<{title?: string; subtitle?: string; emoji?: string}>) {
  const c = useTheme(); const playback = usePlayer();
  return <View style={{paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, ...gradientStyle(c.headerGlow, c.immersive ? 'transparent' : c.bg)} as ViewStyle}>
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

export function Button({title, onPress, secondary = false, icon, disabled}: {title: string; onPress: () => void; secondary?: boolean; icon?: IconName; disabled?: boolean}) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed}) => ({minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, backgroundColor: secondary ? c.surfaceAlt : c.primary, opacity: disabled ? .5 : pressed ? .75 : 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8})}>
    {icon && <Ionicons name={icon} size={18} color={secondary ? c.text : c.onPrimary}/>}<Label style={{color: secondary ? c.text : c.onPrimary, fontWeight: '700', textAlign: 'center'}}>{title}</Label>
  </Pressable>;
}

/** Selectable pill, as in the reference search filters. */
export function Chip({label, selected, onPress, icon, onRemove}: {label: string; selected?: boolean; onPress?: () => void; icon?: IconName; onRemove?: () => void}) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{selected}} accessibilityLabel={onRemove ? `Quitar filtro ${label}` : label} onPress={onRemove ?? onPress}
    style={({pressed}) => ({minHeight: 38, paddingHorizontal: 14, borderRadius: 99, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? .7 : 1,
      backgroundColor: selected ? c.primary : c.surface, borderWidth: 1, borderColor: selected ? c.primary : c.border})}>
    {icon && <Ionicons name={icon} size={15} color={selected ? c.onPrimary : c.muted}/>}
    <Label numberOfLines={1} style={{fontSize: 13, fontWeight: '600', color: selected ? c.onPrimary : c.text, maxWidth: 200}}>{label}</Label>
    {onRemove && <Ionicons name="close" size={15} color={selected ? c.onPrimary : c.muted}/>}
  </Pressable>;
}

export function Card({children, style}: PropsWithChildren<{style?: StyleProp<ViewStyle>}>) {const c = useTheme(); return <View style={[cardStyle(c), {padding: 18, gap: 12}, style]}>{children}</View>;}

/** Emoji flag from an ISO country code (rendered by the system emoji font). */
export const flag = (code?: string) => code && /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65)) : '🌐';

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

export function Favorite({station, size = 22}: {station: Station; size?: number}) {
  const c = useTheme(); const favorites = useLibrary(s => s.favorites); const toggle = useLibrary(s => s.toggle); const selected = favorites.some(s => s.id === station.id);
  return <Pressable accessibilityRole="button" accessibilityLabel={selected ? 'Quitar de favoritos' : 'Añadir a favoritos'} accessibilityState={{selected}} onPress={() => toggle(station)} hitSlop={4} style={{minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center'}}><Ionicons name={selected ? 'heart' : 'heart-outline'} size={size} color={selected ? c.live : c.muted}/></Pressable>;
}

const subtitleFor = (station: Station) => [station.region || station.country, station.tags[0] ? tagLabel(station.tags[0]) : station.codec].filter(Boolean).join(' · ');

export function StationRow({station, onRemove, onPress, selected, card}: {station: Station; onRemove?: () => void; onPress?: () => void; selected?: boolean; card?: boolean}) {
  const c = useTheme(); const [menu, setMenu] = useState(false);
  return <View style={[{flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6, paddingHorizontal: selected || card ? 8 : 0, borderRadius: 18, backgroundColor: selected ? c.primary + '14' : 'transparent'},
    card && !selected && {backgroundColor: c.surface, boxShadow: c.shadow, marginBottom: 8, paddingVertical: 8} as ViewStyle, card && selected && {marginBottom: 8, paddingVertical: 8, borderWidth: 1, borderColor: c.primary + '55'}]}>
    <Pressable accessibilityRole="button" accessibilityLabel={(onPress ? 'Seleccionar ' : 'Escuchar ') + station.name} onPress={onPress ?? (() => player.select(station))} style={({pressed}) => ({flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center', opacity: pressed ? .7 : 1})}>
      <Artwork key={station.id} station={station} size={50}/>
      <View style={{flex: 1, gap: 2}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}><Label numberOfLines={1} style={{fontWeight: '700', flexShrink: 1}}>{station.name}</Label><StationStatus station={station}/></View>
        <Muted numberOfLines={1}>{flag(station.countryCode)} {subtitleFor(station)}</Muted>
      </View>
    </Pressable>
    <Favorite station={station}/>
    <IconButton icon="ellipsis-vertical" plain label={'Más opciones de ' + station.name} onPress={() => setMenu(true)}/>
    {menu && <StationActions station={station} onClose={() => setMenu(false)} onRemove={onRemove}/>}
  </View>;
}

/** Actions for a station: collections, sharing, details. */
export function StationActions({station, onClose, onRemove}: {station: Station; onClose: () => void; onRemove?: () => void}) {
  const [picker, setPicker] = useState(false);
  if (picker) return <CollectionPicker station={station} onClose={onClose}/>;
  const share = () => {onClose(); void Share.share({message: `${station.name} — ${station.homepage ?? station.streamUrl}`}).catch(() => {});};
  return <Sheet title={station.name} onClose={onClose}>
    <ActionRow icon="play-circle-outline" label="Escuchar ahora" onPress={() => {onClose(); player.select(station);}}/>
    <ActionRow icon="albums-outline" label="Guardar en una colección" onPress={() => setPicker(true)}/>
    {onRemove && <ActionRow icon="remove-circle-outline" label="Quitar de esta colección" onPress={() => {onClose(); onRemove();}}/>}
    <ActionRow icon="share-social-outline" label="Compartir emisora" onPress={share}/>
    <ActionRow icon="information-circle-outline" label="Abrir en el reproductor" onPress={() => {onClose(); player.select(station); router.push('/player');}}/>
  </Sheet>;
}
export function ActionRow({icon, label, detail, onPress}: {icon: IconName; label: string; detail?: string; onPress: () => void}) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed}) => ({minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4, opacity: pressed ? .6 : 1})}>
    <View style={{width: 36, height: 36, borderRadius: 12, backgroundColor: c.primary + '18', alignItems: 'center', justifyContent: 'center'}}><Ionicons name={icon} size={20} color={c.primaryText}/></View>
    <Label style={{flex: 1, fontWeight: '600'}}>{label}</Label>{detail ? <Muted>{detail}</Muted> : null}<Ionicons name="chevron-forward" size={18} color={c.muted}/>
  </Pressable>;
}

/** Bottom sheet used for menus, pickers and forms. */
export function Sheet({title, onClose, children, scroll = true}: PropsWithChildren<{title: string; onClose: () => void; scroll?: boolean}>) {
  const c = useTheme(); const insets = useSafeAreaInsets(); const desktop = useDesktop();
  return <Modal transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1, justifyContent: desktop ? 'center' : 'flex-end', backgroundColor: '#00000066'}}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={desktop ? {position: 'absolute', inset: 0} : {flex: 1}}/>
      <View accessibilityViewIsModal style={{backgroundColor: c.bg, borderRadius: desktop ? 24 : 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 + insets.bottom, gap: 10, maxHeight: '88%', width: '100%', maxWidth: desktop ? 560 : 480, alignSelf: 'center'}}>
        <View style={{alignSelf: 'center', width: 40, height: 4, borderRadius: 4, backgroundColor: c.border}}/>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><Label accessibilityRole="header" numberOfLines={2} style={{flex: 1, fontSize: 19, lineHeight: 25, fontWeight: '800'}}>{title}</Label><IconButton icon="close" label="Cerrar" onPress={onClose}/></View>
        {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap: 4, paddingBottom: 8}}>{children}</ScrollView> : children}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

export type PickerOption = {value: string; label: string; detail?: string; leading?: string};
/** Searchable list of catalog values (countries, languages, genres, places) with their real counts. */
export function OptionPicker({title, options, selected, onSelect, onClose, loading, error, retry}: {title: string; options: PickerOption[]; selected?: string; onSelect: (value: string) => void; onClose: () => void; loading?: boolean; error?: string; retry?: () => void}) {
  const c = useTheme(); const [text, setText] = useState('');
  const needle = fold(text);
  const rows = options.filter(o => !needle || fold(o.label).includes(needle) || o.value.toLowerCase() === needle);
  return <Sheet title={title} onClose={onClose} scroll={false}>
    <SearchField value={text} onChange={setText} placeholder="Filtrar" label={'Filtrar ' + title.toLowerCase()}/>
    {loading ? <Loading rows={4}/> : error ? <Message title="No se pudo cargar" body={error} retry={retry}/> :
      <FlatList data={rows} keyExtractor={o => o.value} keyboardShouldPersistTaps="handled" style={{maxHeight: 460}} initialNumToRender={20}
        ListEmptyComponent={<Muted style={{padding: 16, textAlign: 'center'}}>Sin coincidencias.</Muted>}
        renderItem={({item}) => <Pressable accessibilityRole="radio" accessibilityState={{checked: item.value === selected}} onPress={() => {onSelect(item.value); onClose();}} style={({pressed}) => ({minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 6, borderRadius: 12, opacity: pressed ? .6 : 1, backgroundColor: item.value === selected ? c.primary + '16' : 'transparent'})}>
          {item.leading ? <Text style={{fontSize: 22}}>{item.leading}</Text> : null}
          <Label numberOfLines={1} style={{flex: 1, fontWeight: item.value === selected ? '700' : '500'}}>{item.label}</Label>
          {item.detail ? <Muted>{item.detail}</Muted> : null}
          {item.value === selected && <Ionicons name="checkmark" size={18} color={c.primaryText}/>}
        </Pressable>}/>}
  </Sheet>;
}
export const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const formatCount = (n: number) => n.toLocaleString('es');

export function SearchField({value, onChange, placeholder, label, onSubmit, autoFocus}: {value: string; onChange: (v: string) => void; placeholder: string; label: string; onSubmit?: () => void; autoFocus?: boolean}) {
  const c = useTheme();
  return <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14}}>
    <Ionicons name="search" size={18} color={c.muted}/>
    <TextInput accessibilityLabel={label} autoFocus={autoFocus} placeholder={placeholder} placeholderTextColor={c.muted} value={value} onChangeText={onChange} onSubmitEditing={onSubmit} returnKeyType="search" autoCorrect={false} style={{flex: 1, minHeight: 48, color: c.text, fontSize: 15}}/>
    {value ? <Pressable accessibilityRole="button" accessibilityLabel="Borrar texto" onPress={() => onChange('')} hitSlop={8}><Ionicons name="close-circle" size={20} color={c.muted}/></Pressable> : null}
  </View>;
}

export function Loading({rows = 3}: {rows?: number}) {
  const c = useTheme();
  return <View accessibilityLabel="Cargando emisoras" accessibilityRole="progressbar" style={{gap: 14, paddingVertical: 8}}>
    {Array.from({length: rows}, (_, k) => <View key={k} style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}><View style={{width: 50, height: 50, borderRadius: 14, backgroundColor: c.surfaceAlt}}/><View style={{flex: 1, gap: 8}}><View style={{height: 12, width: '70%', borderRadius: 6, backgroundColor: c.surfaceAlt}}/><View style={{height: 10, width: '40%', borderRadius: 6, backgroundColor: c.surfaceAlt}}/></View></View>)}
  </View>;
}
export function Message({title, body, retry, icon = 'cloud-offline-outline'}: {title: string; body: string; retry?: () => void; icon?: IconName}) {
  const c = useTheme();
  return <Card style={{alignItems: 'flex-start'}}><View style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}><Ionicons name={icon} size={22} color={c.primaryText}/><Label style={{fontSize: 17, fontWeight: '700', flex: 1}}>{title}</Label></View><Muted style={{fontSize: 14, lineHeight: 20}}>{body}</Muted>{retry && <Button title="Reintentar" icon="refresh" onPress={retry}/>}</Card>;
}
export function EmptyState({icon, title, body, children}: PropsWithChildren<{icon: IconName; title: string; body: string}>) {
  const c = useTheme();
  return <View style={{alignItems: 'center', paddingVertical: 28, gap: 12}}><View style={{backgroundColor: c.primary + '16', padding: 22, borderRadius: 99}}><Ionicons name={icon} size={34} color={c.primaryText}/></View><Label style={{fontSize: 19, fontWeight: '800', textAlign: 'center'}}>{title}</Label><Muted style={{fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 300}}>{body}</Muted>{children}</View>;
}

/** Footer for progressive lists: loading, retry, end of results or in-memory limit. */
export function ListFooter({feed, endLabel = 'Has llegado al final de la lista.'}: {feed: {isFetchingNextPage: boolean; hasNextPage: boolean; isFetchNextPageError: boolean; capped: boolean; items: unknown[]; loadMore: () => void; fetchNextPage: () => unknown}; endLabel?: string}) {
  const c = useTheme();
  if (feed.isFetchingNextPage) return <View style={{padding: 18}}><ActivityIndicator color={c.primary} accessibilityLabel="Cargando más emisoras"/></View>;
  if (feed.isFetchNextPageError) return <View style={{padding: 12, alignItems: 'center', gap: 8}}><Muted>No se pudieron cargar más emisoras.</Muted><Button title="Reintentar" icon="refresh" secondary onPress={() => void feed.fetchNextPage()}/></View>;
  if (feed.capped) return <Muted style={{padding: 18, textAlign: 'center'}}>Mostrando {formatCount(feed.items.length)} emisoras. Usa los filtros para afinar la búsqueda.</Muted>;
  if (feed.hasNextPage) return <View style={{padding: 12, alignItems: 'center'}}><Button title="Cargar más" secondary onPress={feed.loadMore}/></View>;
  return feed.items.length > 0 ? <Muted style={{padding: 18, textAlign: 'center'}}>{endLabel}</Muted> : null;
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

export function PlayButton({active, onPress, label, size = 44}: {active: boolean; onPress: () => void; label: string; size?: number}) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({pressed}) => ({width: size, height: size, borderRadius: size / 2, ...gradientStyle(c.brand, c.primary), alignItems: 'center', justifyContent: 'center', opacity: pressed ? .75 : 1, boxShadow: `0px 6px 16px ${c.primary}55`} as ViewStyle)}>
    <Ionicons name={active ? 'pause' : 'play'} size={size * .45} color="#FFFFFF" style={{marginLeft: active ? 0 : size * .05}}/>
  </Pressable>;
}

export function IconButton({icon, label, onPress, large = false, plain = false, tint}: {icon: IconName; label: string; onPress: () => void; large?: boolean; plain?: boolean; tint?: string}) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4} style={({pressed}) => ({width: large ? 72 : 44, height: large ? 72 : 44, borderRadius: 99, backgroundColor: large ? c.primary : plain ? 'transparent' : c.surface, alignItems: 'center', justifyContent: 'center', opacity: pressed ? .6 : 1, borderWidth: large || plain ? 0 : 1, borderColor: c.border})}>
    <Ionicons name={icon} size={large ? 34 : 22} color={tint ?? (large ? c.onPrimary : c.text)}/>
  </Pressable>;
}
export function SectionTitle({title, action, onPress}: {title: string; action?: string; onPress?: () => void}) {
  const c = useTheme();
  return <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: -6}}><Label accessibilityRole="header" style={{fontSize: 18, lineHeight: 24, fontWeight: '800', flex: 1}}>{title}</Label>{action && <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={{minHeight: 44, justifyContent: 'center'}}><Label style={{fontSize: 13, fontWeight: '600', color: c.primaryText}}>{action}</Label></Pressable>}</View>;
}
export function StationTile({station}: {station: Station}) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={'Escuchar ' + station.name} onPress={() => player.select(station)} style={({pressed}) => ({width: 116, gap: 6, opacity: pressed ? .75 : 1})}>
    <View><Artwork station={station} size={116}/><View style={{position: 'absolute', bottom: 8, right: 8, backgroundColor: c.surface, borderRadius: 99, padding: 7, boxShadow: c.shadow} as ViewStyle}><Ionicons name="play" size={14} color={c.primaryText}/></View><View style={{position: 'absolute', top: 8, left: 8}}><StationStatus station={station}/></View></View>
    <Label numberOfLines={1} style={{fontSize: 13, lineHeight: 18, fontWeight: '700'}}>{station.name}</Label>
    <Muted numberOfLines={1} style={{fontSize: 12, lineHeight: 16}}>{flag(station.countryCode)} {station.country}</Muted>
  </Pressable>;
}

/** Spanish labels for the most common catalog genres; the API provides labels for facet lists. */
const genreLabels: Record<string, string> = {
  pop: 'Pop', rock: 'Rock', news: 'Noticias', talk: 'Hablada', music: 'Variada', classical: 'Clásica', jazz: 'Jazz', dance: 'Dance',
  electronic: 'Electrónica', oldies: 'Clásicos', '80s': 'Años 80', '90s': 'Años 90', '70s': 'Años 70', hits: 'Éxitos', 'top 40': 'Top 40',
  christian: 'Cristiana', religious: 'Religiosa', sports: 'Deportes', chillout: 'Chill out', ambient: 'Ambiental', romantic: 'Romántica',
  latin: 'Latina', salsa: 'Salsa', cumbia: 'Cumbia', reggaeton: 'Reguetón', folk: 'Folk', 'world music': 'Músicas del mundo', 'hip hop': 'Hip hop',
  country: 'Country', public: 'Pública', 'public radio': 'Radio pública', 'community radio': 'Comunitaria', culture: 'Cultura', information: 'Información',
  entertainment: 'Entretenimiento', alternative: 'Alternativa', indie: 'Indie', metal: 'Metal', house: 'House', techno: 'Techno', soul: 'Soul', blues: 'Blues',
};
export const tagLabel = (tag: string) => genreLabels[tag] ?? (tag.charAt(0).toUpperCase() + tag.slice(1));

export function CollectionPicker({station, onClose}: {station: Station; onClose: () => void}) {
  const c = useTheme();
  const collections = useLibrary(s => s.collections);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const create = () => {
    const id = useLibrary.getState().createCollection(name);
    if (!id) {setError('Escribe un nombre para tu colección.'); return;}
    useLibrary.getState().addToCollection(id, station);
    Keyboard.dismiss(); onClose();
  };
  return <Sheet title="Guardar en colección" onClose={onClose}>
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 6}}><Artwork station={station} size={44}/><Label numberOfLines={2} style={{flex: 1, fontWeight: '700'}}>{station.name}</Label></View>
    {collections.length === 0 && <Muted style={{fontSize: 14}}>Crea tu primera colección para reunir las radios de cada momento.</Muted>}
    {collections.map(collection => {
      const saved = collection.stations.some(s => s.id === station.id);
      return <Pressable key={collection.id} accessibilityRole="checkbox" accessibilityState={{checked: saved}} accessibilityLabel={collection.name} onPress={() => {
        const library = useLibrary.getState();
        if (saved) library.removeFromCollection(collection.id, station.id);
        else library.addToCollection(collection.id, station);
      }} style={{minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: c.surface, borderRadius: 16, marginBottom: 6}}>
        <Ionicons name="albums-outline" size={22} color={c.primaryText}/><View style={{flex: 1}}><Label style={{fontWeight: '700'}}>{collection.name}</Label><Muted>{collection.stations.length} {collection.stations.length === 1 ? 'emisora' : 'emisoras'}</Muted></View><Ionicons name={saved ? 'checkbox' : 'square-outline'} size={24} color={saved ? c.primary : c.muted}/>
      </Pressable>;
    })}
    <Label style={{fontWeight: '700', marginTop: 6}}>Nueva colección</Label>
    <TextInput accessibilityLabel="Nombre de la colección" placeholder="Por ejemplo, Música para trabajar" placeholderTextColor={c.muted} value={name} maxLength={50} onChangeText={value => {setName(value); setError('');}} onSubmitEditing={create} returnKeyType="done" style={{minHeight: 50, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border, color: c.text, backgroundColor: c.surface}}/>
    {error ? <Label accessibilityLiveRegion="polite" style={{color: c.live, fontSize: 13}}>{error}</Label> : null}
    <View style={{gap: 8, marginTop: 4}}><Button title="Crear y guardar emisora" onPress={create}/><Button title="Listo" secondary onPress={onClose}/></View>
  </Sheet>;
}
