import {useEffect, useState} from 'react';
import {Linking, Pressable, View} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {useTheme} from '../../theme';
import {Ionicons} from '../../icons';
import {Button, Chip, Label, Muted} from '../../ui';
import {FormField} from '../../components/forms';
import {formatClock, parseClock, projectedPosition, streamServiceOf, streamServices, type MediaInput, type RoomMedia} from './types';

const explanation = 'ONDA no transmite ni incrusta estos servicios. Cada persona abre el título con su propia cuenta; la sala comparte el reloj, la pausa y el chat.';

/** Picker for subscription titles: official link + optional title. */
export function StreamForm({value, onChange}: {value: MediaInput; onChange: (value: MediaInput) => void}) {
  const c = useTheme();
  const [error, setError] = useState('');
  const service = streamServiceOf(value.url);
  const paste = async () => {
    try {
      const text = (await Clipboard.getStringAsync()).trim().slice(0, 2000);
      onChange({...value, kind: 'stream', url: text});
      setError(streamServiceOf(text) ? '' : 'Ese enlace no es de un título de un servicio compatible.');
    } catch {setError('No se pudo pegar. Mantén pulsado el campo para usar Pegar.');}
  };
  return <View style={{gap: 12}}>
    <Muted>{explanation}</Muted>
    <Label style={{fontWeight: '800'}}>1. Abre el servicio y copia el enlace del título</Label>
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
      {streamServices.map(item => <Chip key={item.id} label={item.label} selected={service?.id === item.id}
        onPress={() => void Linking.openURL(item.home).catch(() => setError(`No se pudo abrir ${item.label}.`))}/>)}
    </View>
    <Muted style={{fontSize: 12}}>En la app o web del servicio usa Compartir → Copiar enlace del título o del episodio.</Muted>
    <Label style={{fontWeight: '800'}}>2. Pega el enlace aquí</Label>
    <FormField label="Enlace del título" value={value.url ?? ''} keyboardType="url" maxLength={2000} placeholder="https://www.netflix.com/title/…"
      onChange={url => {onChange({...value, kind: 'stream', url}); setError('');}}/>
    <Button title="Pegar enlace" secondary icon="clipboard-outline" onPress={() => void paste()}/>
    {!!value.url && (service
      ? <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><Ionicons name="checkmark-circle" size={18} color={c.primaryText}/><Muted>{service.label} reconocido.</Muted></View>
      : <Muted accessibilityRole="alert" style={{color: c.live}}>{error || 'Usa el enlace de un título (no la página de inicio) de un servicio de la lista.'}</Muted>)}
    <FormField label="Título (opcional)" value={value.title ?? ''} maxLength={120} placeholder="Ej.: Stranger Things T4 E1"
      onChange={title => onChange({...value, kind: 'stream', title})}/>
  </View>;
}

/**
 * In-room stage for a subscription title: a shared clock that runs with the room, an «open in» button and,
 * for hosts, exact time adjustment. Everyone controls their own app; nothing is embedded.
 */
export function StreamStage({media, playing, position, positionAt, controller, connected, onPlayback}: {
  media: RoomMedia; playing: boolean; position: number; positionAt: number; controller: boolean; connected: boolean;
  onPlayback: (playing: boolean, position: number) => void;
}) {
  const c = useTheme();
  const service = streamServices.find(x => x.id === media.category) ?? streamServiceOf(media.url);
  const [now, setNow] = useState(() => Date.now());
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [playing]);
  const current = projectedPosition(position, playing, positionAt, Math.max(now, positionAt));
  const parsed = parseClock(text);
  return <View style={{padding: 14, gap: 10, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border}}>
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: c.surfaceAlt}}>
        <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: service?.color ?? c.primary}}/>
        <Label style={{fontSize: 12, fontWeight: '900'}}>{service?.label ?? 'Streaming'}</Label>
      </View>
      <Muted numberOfLines={1} style={{fontSize: 11, flex: 1}}>Cada persona con su cuenta</Muted>
    </View>
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
      <View accessible accessibilityLiveRegion="polite" accessibilityLabel={`${playing ? 'Reproduciendo' : 'En pausa'} en ${formatClock(current)}. Pon tu reproductor en ese tiempo.`} style={{flex: 1}}>
        <Label style={{fontSize: 34, fontWeight: '900', fontVariant: ['tabular-nums'], lineHeight: 40}}>{formatClock(current)}</Label>
        <Muted style={{fontSize: 12, color: playing ? c.primaryText : c.muted}}>{playing ? '▶ Reloj de referencia de la sala' : '❚❚ La sala está en pausa'}</Muted>
        <Muted style={{fontSize: 11}}>Sincronización manual: ONDA no controla el reproductor del servicio.</Muted>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Abrir en ${service?.label ?? 'el servicio'}`} onPress={() => void Linking.openURL(media.url!)}
        style={({pressed}) => ({minHeight: 48, paddingHorizontal: 16, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.primary, opacity: pressed ? .8 : 1})}>
        <Ionicons name="open-outline" size={18} color={c.onPrimary}/>
        <Label style={{fontWeight: '800', color: c.onPrimary}}>Abrir</Label>
      </Pressable>
    </View>
    {controller && (editing
      ? <View style={{gap: 8}}>
        <FormField label="Ir al minuto (h:mm:ss o mm:ss)" value={text} onChange={setText} keyboardType="numbers-and-punctuation" maxLength={8} placeholder={formatClock(current)}/>
        <View style={{flexDirection: 'row', gap: 8}}>
          <View style={{flex: 1}}><Button title="Cancelar" secondary onPress={() => setEditing(false)}/></View>
          <View style={{flex: 1}}><Button title="Ajustar para todos" disabled={parsed === null || !connected}
            onPress={() => {if (parsed !== null) {onPlayback(playing, parsed); setEditing(false);}}}/></View>
        </View>
      </View>
      : <Pressable accessibilityRole="button" accessibilityLabel="Ajustar el tiempo de la sala" disabled={!connected}
        onPress={() => {setText(formatClock(current)); setEditing(true);}} style={{minHeight: 44, justifyContent: 'center', alignSelf: 'center'}}>
        <Label style={{color: c.primaryText, fontWeight: '700'}}>Ajustar el tiempo de la sala</Label>
      </Pressable>)}
  </View>;
}

/**
 * Room stage for subscription titles. These services do not allow third-party embedding or remote control, so ONDA
 * does not try to: each person opens the title in the official app or site with their own account, and the room
 * shares a reference clock (set by the host), the pause state and the chat.
 */
export function StreamRoomStage(p: {
  media: RoomMedia; playing: boolean; position: number; positionAt: number; controller: boolean; connected: boolean;
  onPlayback: (playing: boolean, position: number) => void;
}) {
  const c = useTheme();
  if (!p.media.url) return <View style={{padding: 16, gap: 10, borderRadius: 20, backgroundColor: c.surface}}>
    <Label style={{fontSize: 18, fontWeight: '800'}}>{p.controller ? 'Pega el enlace del título' : 'El anfitrión está eligiendo qué ver'}</Label>
    <Muted style={{fontSize: 12}}>{explanation}</Muted>
  </View>;
  return <StreamStage media={p.media} playing={p.playing} position={p.position} positionAt={p.positionAt} controller={p.controller}
    connected={p.connected} onPlayback={p.onPlayback}/>;
}
