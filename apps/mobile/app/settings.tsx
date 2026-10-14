import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, View } from 'react-native';
import Constants from 'expo-constants';
import {router} from 'expo-router';
import {useAuth} from '../src/features/account/session';
import {useCloudSync} from '../src/features/account/cloud-sync';
import { useCatalogStatus, useCountries, useTags } from '../src/catalog';
import { useLibrary } from '../src/library';
import { useTheme } from '../src/theme';
import { deviceCountry } from '../src/region';
import { Ionicons } from '../src/icons';
import { Button, Card, Chip, Label, Muted, OptionPicker, Page, ScreenHeader, Sheet, cardStyle, flag, formatCount } from '../src/ui';

const themes = {dark: 'ONDA inmersivo', light: 'Claro', soft: 'Azul gris suave', system: 'Automático'} as const;

export default function Settings() {
  const c = useTheme(); const library = useLibrary();
  const user = useAuth(s => s.session?.user); const cloud = useCloudSync();
  const countries = useCountries(); const tags = useTags(); const status = useCatalogStatus();
  const [sheet, setSheet] = useState<'country' | 'theme' | 'genres' | null>(null);
  const countryName = countries.data?.find(x => x.code === library.country)?.name ?? library.country;
  const detected = deviceCountry();
  const detectedName = detected ? countries.data?.find(x => x.code === detected.code)?.name ?? detected.code : null;
  const tagLabels = library.likedTags.map(t => tags.data?.find(x => x.value === t)?.label ?? t);
  const clear = () => {
    const run = () => library.clear();
    if (Platform.OS === 'web') {if (globalThis.confirm?.('¿Borrar favoritos, historial, colecciones y búsquedas de este dispositivo?')) run(); return;}
    Alert.alert('Borrar datos locales', 'Esta acción elimina tus favoritos, historial, colecciones y búsquedas de este dispositivo.', [{text: 'Cancelar', style: 'cancel'}, {text: 'Borrar', style: 'destructive', onPress: run}]);
  };
  const synced = status.data?.lastCompletedSync ? new Date(status.data.lastCompletedSync).toLocaleString('es', {dateStyle: 'medium', timeStyle: 'short'}) : null;
  return <View style={{flex: 1}}>
    <ScreenHeader title="Perfil y ajustes" back/>
    <Page>
      <Card style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
        <View style={{width: 54, height: 54, borderRadius: 27, backgroundColor: c.primary + '1C', alignItems: 'center', justifyContent: 'center'}}><Ionicons name="person" size={26} color={c.primaryText}/></View>
        <View style={{flex: 1}}><Label style={{fontWeight: '800', fontSize: 17}}>{user?.displayName ?? 'Modo invitado'}</Label><Muted>{user?.email ?? 'Escucha y entra a salas sin registro. Crea una cuenta para sincronizar tu biblioteca.'}</Muted></View><Button title={user && !user.guest ? 'Mi cuenta' : 'Entrar'} secondary onPress={() => router.push('/account')}/>
      </Card>
      {cloud.error && <Muted accessibilityRole="alert">{cloud.error}</Muted>}
      <Button title="Tu pasaporte sonoro" icon="earth-outline" secondary onPress={() => router.push('/passport')}/>
      <View style={[cardStyle(c), {paddingHorizontal: 16, paddingVertical: 4}]}>
        <Row icon="flag-outline" label="País" value={`${flag(library.country)} ${countryName}${library.countryMode === 'auto' ? ' · auto' : ''}`} onPress={() => setSheet('country')}/>
        <Row icon="musical-notes-outline" label="Géneros favoritos" value={tagLabels.length ? tagLabels.slice(0, 2).join(', ') + (tagLabels.length > 2 ? '…' : '') : 'Sin elegir'} onPress={() => setSheet('genres')}/>
        <Row icon="contrast-outline" label="Tema" value={themes[library.theme]} onPress={() => setSheet('theme')} last/>
      </View>
      <View style={[cardStyle(c), {padding: 16, gap: 8}]}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}><Ionicons name="server-outline" size={20} color={c.primaryText}/><Label style={{fontWeight: '800', flex: 1}}>Catálogo de radios</Label></View>
        {status.isPending ? <Muted>Consultando…</Muted> : status.isError ? <Muted>No se pudo consultar el estado del catálogo.</Muted> : <>
          <Muted>{formatCount(status.data.playable)} emisoras HTTPS disponibles de {formatCount(status.data.stations)} registradas.</Muted>
          <Muted>{synced ? `Última sincronización completa: ${synced}.` : status.data.runningStatus ? `Primera sincronización en curso (${formatCount(status.data.runningOffset ?? 0)} registros revisados).` : 'Aún no hay una sincronización completa.'}</Muted>
          <Muted style={{fontSize: 12}}>{status.data.attribution}</Muted>
        </>}
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://www.radio-browser.info')}><Label style={{color: c.primaryText, fontWeight: '600', fontSize: 14}}>Conoce Radio Browser</Label></Pressable>
      </View>
      <View style={[cardStyle(c), {padding: 16, gap: 8}]}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}><Ionicons name="shield-checkmark-outline" size={20} color={c.primaryText}/><Label style={{fontWeight: '800'}}>Privacidad</Label></View>
        <Muted style={{fontSize: 14, lineHeight: 20}}>ONDA no solicita GPS ni graba transmisiones. Al reproducir, la emisora o proveedor recibe tu conexión. Las cuentas y salas usan tu identidad; puedes elegir qué biblioteca sincronizar.</Muted><Button title="Privacidad y convivencia" secondary onPress={() => router.push('/privacy')}/>
        <Button title="Borrar biblioteca local" icon="trash-outline" secondary onPress={clear}/>
      </View>
      <Muted style={{textAlign: 'center', fontSize: 12}}>ONDA · El mundo suena aquí · Versión {Constants.expoConfig?.version ?? 'dev'} (desarrollo)</Muted>
    </Page>
    {sheet === 'country' && <OptionPicker title="País de tus radios" selected={library.countryMode === 'auto' ? 'auto' : library.country} onClose={() => setSheet(null)}
      onSelect={value => value === 'auto' && detected ? library.followDeviceCountry(detected.code) : library.setCountry(value)}
      loading={countries.isPending} error={countries.error?.message} retry={() => countries.refetch()}
      options={[...(detected ? [{value: 'auto', label: `Automático: ${detectedName}`, leading: '📍', detail: detected.source === 'timezone' ? 'zona horaria' : 'idioma'}] : []),
        ...(countries.data ?? []).map(x => ({value: x.code, label: x.name, leading: flag(x.code), detail: formatCount(x.count)}))]}/>}
    {sheet === 'theme' && <Sheet title="Tema" onClose={() => setSheet(null)}>
      {(Object.keys(themes) as (keyof typeof themes)[]).map(t => <Pressable key={t} accessibilityRole="radio" accessibilityState={{checked: library.theme === t}} onPress={() => {library.setTheme(t); setSheet(null);}} style={{minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12}}>
        <Ionicons name={library.theme === t ? 'radio-button-on' : 'radio-button-off'} size={22} color={library.theme === t ? c.primary : c.muted}/><Label>{themes[t]}</Label>
      </Pressable>)}
    </Sheet>}
    {sheet === 'genres' && <Sheet title="Géneros favoritos" onClose={() => setSheet(null)}>
      <Muted style={{paddingBottom: 8}}>Hasta 5. Personalizan Inicio y Radar en este dispositivo.</Muted>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{(tags.data ?? []).slice(0, 40).map(t => {
        const on = library.likedTags.includes(t.value);
        return <Chip key={t.value} label={t.label} selected={on} onPress={() => library.setLikedTags(on ? library.likedTags.filter(x => x !== t.value) : library.likedTags.length < 5 ? [...library.likedTags, t.value] : library.likedTags)}/>;
      })}</View>
    </Sheet>}
  </View>;
}

function Row({icon, label, value, onPress, last}: {icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; onPress: () => void; last?: boolean}) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={({pressed}) => ({minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: last ? 0 : 1, borderColor: c.border, opacity: pressed ? .6 : 1})}>
    <Ionicons name={icon} size={20} color={c.primaryText}/><Label style={{flex: 1, fontWeight: '600'}}>{label}</Label><Muted numberOfLines={1} style={{maxWidth: 160}}>{value}</Muted><Ionicons name="chevron-forward" size={18} color={c.muted}/>
  </Pressable>;
}
