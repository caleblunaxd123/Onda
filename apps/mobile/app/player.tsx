import { useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Platform, Pressable, ScrollView, Share, TextInput, View, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { sendReport, useStationFeed, type ReportKind } from '../src/catalog';
import { isActive, player, usePlayer } from '../src/player';
import { useTheme } from '../src/theme';
import { Ionicons } from '../src/icons';
import { ActionRow, Artwork, Button, Card, CollectionPicker, EmptyState, Favorite, IconButton, Label, LiveBadge, Muted, PlayButton, SectionTitle, Sheet, StationRow, flag, stateLabels, tagLabel } from '../src/ui';
import type { Station } from '../src/types';
import { Equalizer, SoundWaves } from '../src/waves';

export default function FullPlayer() {
  const c = useTheme(); const s = usePlayer();
  const station = s.station;
  const similar = useStationFeed({tag: station?.tags[0], order: 'discover', exclude: station ? [station.id] : []}, {limit: 8, enabled: !!station?.tags[0]});
  const [sheet, setSheet] = useState<'timer' | 'report' | 'collection' | 'queue' | null>(null);
  const close = () => router.canGoBack() ? router.back() : router.replace('/');
  if (!station) return <View style={{flex: 1, backgroundColor: c.bg, padding: 20}}>
    <IconButton icon="chevron-down" plain label="Cerrar reproductor" onPress={close}/>
    <EmptyState icon="radio-outline" title="Tu mundo, en directo" body="Elige una emisora en Inicio, Mundo o Radar para empezar."><Button title="Explorar emisoras" onPress={() => router.replace('/')}/></EmptyState>
  </View>;
  const active = isActive(s.state);
  const status = s.state === 'playing' && !s.error ? null : s.error ?? stateLabels[s.state];
  return <View style={{flex: 1, backgroundColor: c.bg}}>
    <ScrollView contentContainerStyle={{paddingBottom: 32}}>
      <View style={{paddingHorizontal: 20, paddingTop: 8, paddingBottom: 30, gap: 14, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, backgroundColor: c.featuredFallback, experimental_backgroundImage: c.featured} as ViewStyle}>
        <View style={{flexDirection: 'row', alignSelf: 'stretch', alignItems: 'center'}}>
          <IconButton icon="chevron-down" plain tint="#FFFFFF" label="Cerrar reproductor" onPress={close}/>
          <Label style={{flex: 1, textAlign: 'center', color: '#D7DEF2', fontSize: 12, letterSpacing: 2, fontWeight: '700'}}>AHORA SUENA</Label>
          <Favorite station={station} size={24} tint="#FFFFFF"/>
        </View>
        <View style={{width: 300, height: 290, alignItems: 'center', justifyContent: 'center'}}>
          <SoundWaves size={232} color="#7FE7E3" state={s.state === 'playing' && !s.error ? 'playing' : s.state === 'connecting' || s.state === 'buffering' ? 'connecting' : 'idle'}/>
          <View style={{padding: 8, borderRadius: 140, borderWidth: 2, borderColor: '#FFFFFF33', backgroundColor: '#FFFFFF0D'}}>
            <Artwork key={station.id} station={station} size={210} round/>
          </View>
        </View>
        <View style={{minHeight: 26, justifyContent: 'center'}} accessibilityLiveRegion="polite">
          {s.state === 'playing' && !s.error ? <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}><Equalizer color="#FFFFFF" active/><LiveBadge/><Equalizer color="#FFFFFF" active/></View> :
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF1F', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4}}>
              {(s.state === 'connecting' || s.state === 'buffering') && <ActivityIndicator size="small" color="#FFFFFF"/>}
              <Label style={{color: s.state === 'error' ? '#FFB3BF' : '#FFFFFF', fontSize: 13, fontWeight: '600'}}>{status}</Label>
            </View>}
        </View>
        <View style={{alignItems: 'center', gap: 4}}>
          <Label numberOfLines={2} style={{fontSize: 26, lineHeight: 32, fontWeight: '800', color: '#FFFFFF', textAlign: 'center'}}>{station.name}</Label>
          <Label style={{color: '#D7DEF2', fontSize: 14}}>{flag(station.countryCode)} {[station.country, station.region].filter(Boolean).join(' · ')}</Label>
          {station.tags.length > 0 && <Label style={{color: '#B9C3DE', fontSize: 13}}>{station.tags.slice(0, 3).map(tagLabel).join(' · ')}</Label>}
        </View>
        {s.queue.length > 1 && <Pressable accessibilityRole="button" accessibilityLabel="Ver lista de emisoras" onPress={() => setSheet('queue')} style={{minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 99, backgroundColor: '#FFFFFF18', maxWidth: '100%'}}>
          <Ionicons name="list-outline" size={17} color="#FFFFFF"/><Label numberOfLines={1} style={{color: '#FFFFFF', fontSize: 12, fontWeight: '600', flexShrink: 1}}>{s.queueTitle || 'Tu selección'} · {s.queueIndex + 1} de {s.queue.length}</Label>
        </Pressable>}
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 34}}>
          <IconButton icon="play-skip-back" plain tint="#FFFFFF" label="Emisora anterior" disabled={s.queueIndex <= 0} onPress={player.previous}/>
          <View style={{borderRadius: 50, boxShadow: '0px 8px 24px rgba(0,0,0,0.35)'} as ViewStyle}><PlayButton size={80} active={active} label={active ? 'Pausar transmisión' : 'Reproducir transmisión'} onPress={player.toggle}/></View>
          <IconButton icon="play-skip-forward" plain tint="#FFFFFF" label="Emisora siguiente" disabled={s.queueIndex >= s.queue.length - 1} onPress={player.next}/>
        </View>
        <View style={{flexDirection: 'row', gap: 20, justifyContent: 'center'}}>
          <Pressable accessibilityRole="button" accessibilityLabel="Compartir emisora" onPress={() => {void Share.share({message: `${station.name} — ${station.homepage ?? station.streamUrl}`}).catch(() => {});}} style={{minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6}}><Ionicons name="share-social-outline" size={18} color="#FFFFFF"/><Label style={{fontSize: 12, color: '#FFFFFF'}}>Compartir</Label></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Guardar en una colección" onPress={() => setSheet('collection')} style={{minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6}}><Ionicons name="albums-outline" size={18} color="#FFFFFF"/><Label style={{fontSize: 12, color: '#FFFFFF'}}>Guardar</Label></Pressable>
        </View>
        {s.state === 'error' && <Pressable accessibilityRole="button" onPress={player.retryNow} style={{flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 99, paddingHorizontal: 16, paddingVertical: 10}}><Ionicons name="refresh" size={18} color="#1B2257"/><Label style={{color: '#1B2257', fontWeight: '700'}}>Reintentar</Label></Pressable>}
        {s.sources > 1 && <Label style={{color: '#B9C3DE', fontSize: 12}}>Fuente {s.source} de {s.sources}{s.state === 'connecting' && s.attempt > 1 ? ` · intento ${s.attempt}` : ''}</Label>}
      </View>

      <View style={{paddingHorizontal: 20, paddingTop: 18, gap: 18}}>
        <Card style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 12, paddingVertical: 14}}>
          <Option icon="timer-outline" label="Temporizador" value={s.sleepAt ? new Date(s.sleepAt).toLocaleTimeString('es', {hour: '2-digit', minute: '2-digit'}) : 'Apagado'} onPress={() => setSheet('timer')}/>
          <Option icon="pulse-outline" label="Calidad" value={[station.codec, station.bitrate > 0 ? station.bitrate + ' kbps' : ''].filter(Boolean).join(' · ') || 'Sin datos'}/>
          <Option icon="flag-outline" label="Reportar" value="Problema" onPress={() => setSheet('report')}/>
        </Card>
        <Card>
          <Label style={{fontWeight: '800', fontSize: 17}}>Sobre la emisora</Label>
          <Muted style={{fontSize: 14, lineHeight: 20}}>Transmisión en directo desde {[station.region, station.country].filter(Boolean).join(', ') || 'el mundo'}{station.language ? `, en ${station.language.toLowerCase()}` : ''}. ONDA no recibe información fiable de la canción que suena.</Muted>
          {station.availability === 'unstable' && <Muted style={{color: c.live}}>Radio Browser registró fallos recientes en esta emisora; puede tardar en conectar.</Muted>}
          {station.homepage ? <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(station.homepage!)}><Label style={{color: c.primaryText, fontWeight: '600'}}>Visitar la web de la emisora</Label></Pressable> : null}
          <Muted style={{fontSize: 11}}>Datos del catálogo comunitario Radio Browser.</Muted>
        </Card>
        {station.tags[0] && <>
          <SectionTitle title="En una frecuencia similar"/>
          {similar.isPending ? <ActivityIndicator color={c.primary}/> : <View>{similar.items.slice(0, 5).map(x => <StationRow key={x.id} station={x} queue={{stations: similar.items, title: 'En una frecuencia similar'}}/>)}</View>}
        </>}
      </View>
    </ScrollView>
    {sheet === 'timer' && <Sheet title="Temporizador de sueño" onClose={() => setSheet(null)}>
      <Muted style={{paddingBottom: 6}}>La radio se detiene al cumplirse el tiempo. Con la pantalla bloqueada el sistema puede retrasarlo unos instantes.</Muted>
      {[15, 30, 45, 60, 90].map(m => <ActionRow key={m} icon="timer-outline" label={`${m} minutos`} onPress={() => {player.setSleep(m); setSheet(null);}}/>)}
      {s.sleepAt && <ActionRow icon="close-circle-outline" label="Apagar temporizador" onPress={() => {player.setSleep(0); setSheet(null);}}/>}
    </Sheet>}
    {sheet === 'collection' && <CollectionPicker station={station} onClose={() => setSheet(null)}/>}
    {sheet === 'queue' && <Sheet title={s.queueTitle || 'Tu selección'} scroll={false} onClose={() => setSheet(null)}>
      <Muted style={{marginBottom: 8}}>{s.queue.length} emisoras · Elige tu próxima frecuencia</Muted>
      <FlatList data={s.queue} keyExtractor={item => item.id} style={{maxHeight: 460}} initialNumToRender={10}
        renderItem={({item}) => <StationRow station={item} selected={item.id === station.id} queue={{stations: s.queue, title: s.queueTitle}} onPress={() => {player.select(item, {stations: s.queue, title: s.queueTitle}); setSheet(null);}}/>}/>
    </Sheet>}
    {sheet === 'report' && <ReportSheet station={station} streamUrl={s.streamUrl} onClose={() => setSheet(null)}/>}
  </View>;
}

function Option({icon, label, value, onPress}: {icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; onPress?: () => void}) {
  const c = useTheme();
  return <Pressable accessibilityRole={onPress ? 'button' : 'text'} disabled={!onPress} onPress={onPress} style={({pressed}) => ({flex: 1, alignItems: 'center', gap: 4, minWidth: 76, minHeight: 64, opacity: pressed ? .6 : 1})}>
    <Ionicons name={icon} size={22} color={c.primaryText}/><Label style={{fontSize: 13, fontWeight: '700'}}>{label}</Label><Muted numberOfLines={1} style={{fontSize: 12}}>{value}</Muted>
  </Pressable>;
}

const kinds: {value: ReportKind; label: string}[] = [
  {value: 'no_audio', label: 'No suena o no conecta'}, {value: 'cuts', label: 'Se corta o se escucha mal'},
  {value: 'wrong_info', label: 'Datos incorrectos (nombre, país, logo)'}, {value: 'other', label: 'Otro problema'},
];

/** Report flow. Scope is stated to the person: what is stored, where, and what it does not do. */
function ReportSheet({station, streamUrl, onClose}: {station: Station; streamUrl: string | null; onClose: () => void}) {
  const c = useTheme();
  const [kind, setKind] = useState<ReportKind>('no_audio');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const submit = async () => {
    setState('sending');
    try {await sendReport(station, kind, message, streamUrl, Constants.expoConfig?.version ?? 'dev', Platform.OS); setState('sent');}
    catch (e) {setError(e instanceof Error ? e.message : 'No se pudo enviar.'); setState('error');}
  };
  return <Sheet title="Reportar un problema" onClose={onClose}>
    {state === 'sent' ? <EmptyState icon="checkmark-circle-outline" title="Reporte recibido" body="Gracias. Lo revisaremos al actualizar el catálogo. No cambia la emisora automáticamente."><Button title="Cerrar" onPress={onClose}/></EmptyState> : <>
      <Label style={{fontWeight: '700'}}>{station.name}</Label>
      {kinds.map(k => <Pressable key={k.value} accessibilityRole="radio" accessibilityState={{checked: kind === k.value}} onPress={() => setKind(k.value)} style={{minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10}}>
        <Ionicons name={kind === k.value ? 'radio-button-on' : 'radio-button-off'} size={22} color={kind === k.value ? c.primary : c.muted}/><Label style={{flex: 1}}>{k.label}</Label>
      </Pressable>)}
      <TextInput accessibilityLabel="Detalle opcional" placeholder="Detalle opcional (máx. 300 caracteres)" placeholderTextColor={c.muted} value={message} onChangeText={setMessage} maxLength={300} multiline
        style={{minHeight: 80, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: c.border, color: c.text, backgroundColor: c.surface, textAlignVertical: 'top'}}/>
      <Muted style={{fontSize: 12, lineHeight: 17}}>Se guarda en el servidor de ONDA: la emisora, el tipo de problema, tu comentario, la URL de la transmisión, la versión de la app y la plataforma. No incluye tu ubicación ni datos de cuenta. Sirve para revisar el catálogo; no elimina ni oculta la emisora automáticamente.</Muted>
      {state === 'error' && <Label style={{color: c.live, fontSize: 13}}>{error}</Label>}
      <Button title={state === 'sending' ? 'Enviando…' : 'Enviar reporte'} disabled={state === 'sending'} onPress={() => void submit()}/>
    </>}
  </Sheet>;
}
