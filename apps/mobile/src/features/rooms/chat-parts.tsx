import {useEffect, useState, type ReactNode} from 'react';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Reanimated, {useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import {ActivityIndicator, Image, Linking, Modal, Pressable, Text, View, type ImageSourcePropType} from 'react-native';
import * as Haptics from 'expo-haptics';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {AudioSource} from 'expo-audio';
import {useTheme} from '../../theme';
import {Ionicons} from '../../icons';
import {Chip, IconButton, Label, Muted} from '../../ui';
import {attachmentLabel, dayLabel, describeMessage, fileExtension, formatBytes, formatDuration, linkParts, summarizeReactions} from './chat';
import {discardOutgoing, retryOutgoing, reviseOutgoing, type Outgoing} from './chat-draft';
import {audioSource, resolveImage, saveAttachment} from './chat-files';
import {toggleVoice, useVoicePlayer} from './voice';
import type {ChatAttachment, ChatMessage, ChatReply} from './types';

/** Authorized photo thumbnail. The bytes come from the private endpoint; nothing public is involved. */
export function ChatImage({room, item, onOpen}: {room: string; item: ChatAttachment; onOpen: (source: ImageSourcePropType) => void}) {
  const c = useTheme();
  const [source, setSource] = useState<ImageSourcePropType | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    resolveImage(room, item).then(next => {if (alive) {setSource(next); setFailed(false);}}, () => {if (alive) setFailed(true);});
    return () => {alive = false;};
  }, [room, item, attempt]);
  return <Pressable accessibilityRole="imagebutton" accessibilityLabel={failed ? 'No se pudo cargar la foto. Reintentar' : 'Foto. Ver en grande'}
    onPress={() => failed ? setAttempt(x => x + 1) : source && onOpen(source)}
    style={{width: 220, maxWidth: '100%', aspectRatio: 4 / 3, borderRadius: 12, overflow: 'hidden', backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center'}}>
    {source && !failed && <Image source={source} accessibilityIgnoresInvertColors resizeMode="cover" onError={() => setFailed(true)} style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}/>}
    {failed ? <View style={{alignItems: 'center', gap: 4, padding: 8}}><Ionicons name="refresh" size={20} color={c.muted}/><Muted style={{fontSize: 11}}>Toca para reintentar</Muted></View>
      : !source && <ActivityIndicator color={c.primary}/>}
  </Pressable>;
}

export function VoiceNote({room, item, mine}: {room: string; item: ChatAttachment; mine?: boolean}) {
  return <VoiceBar id={item.id} durationMs={item.durationMs ?? 0} mine={mine} source={() => audioSource(room, item)}/>;
}
/** Play/pause bar shared by received notes and the local pre-listen. Playback is local to this device only. */
export function VoiceBar({id, durationMs, source, mine}: {id: string; durationMs: number; source: () => Promise<AudioSource>; mine?: boolean}) {
  const c = useTheme();
  const voice = useVoicePlayer();
  const active = voice.id === id;
  const total = active && voice.duration > 0 ? voice.duration : durationMs;
  const fraction = active && total > 0 ? Math.min(1, voice.position / total) : 0;
  return <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 200}}>
    <Pressable accessibilityRole="button" accessibilityLabel={active && voice.playing ? 'Pausar nota de voz' : `Escuchar nota de voz de ${formatDuration(total)}`}
      onPress={() => void toggleVoice(id, source)}
      style={{width: 44, height: 44, borderRadius: 22, backgroundColor: mine ? c.surface : c.primary, alignItems: 'center', justifyContent: 'center'}}>
      {active && voice.loading ? <ActivityIndicator color={mine ? c.primary : c.onPrimary}/>
        : <Ionicons name={active && voice.playing ? 'pause' : 'play'} size={20} color={mine ? c.primaryText : c.onPrimary}/>}
    </Pressable>
    <View style={{flex: 1, gap: 6}}>
      <View style={{height: 4, borderRadius: 2, backgroundColor: c.border, overflow: 'hidden'}}>
        <View style={{width: `${fraction * 100}%`, height: 4, backgroundColor: c.primary}}/>
      </View>
      <Muted style={{fontSize: 11}}>{active && voice.position > 0 ? `${formatDuration(voice.position)} / ` : ''}{formatDuration(total)}</Muted>
    </View>
  </View>;
}

export function FileCard({room, item, onError}: {room: string; item: ChatAttachment; onError: (message: string) => void}) {
  const c = useTheme();
  const [busy, setBusy] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Archivo ${item.name}, ${formatBytes(item.length)}. Guardar o compartir`} disabled={busy}
    onPress={() => {setBusy(true); void saveAttachment(room, item).catch((e: Error) => onError(e.message)).finally(() => setBusy(false));}}
    style={({pressed}) => ({flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 200, padding: 8, borderRadius: 12, backgroundColor: c.surfaceAlt, opacity: pressed ? .7 : 1})}>
    <View style={{width: 40, height: 40, borderRadius: 10, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center'}}>
      <Ionicons name="document-text-outline" size={20} color={c.accent}/>
    </View>
    <View style={{flex: 1}}>
      <Label numberOfLines={1} style={{fontSize: 13, fontWeight: '700'}}>{item.name}</Label>
      <Muted style={{fontSize: 11}}>{fileExtension(item.name)} · {formatBytes(item.length)}</Muted>
    </View>
    {busy ? <ActivityIndicator color={c.primary}/> : <Ionicons name="download-outline" size={20} color={c.primaryText}/>}
  </Pressable>;
}

export function Quote({reply, onPress, compact}: {reply: ChatReply; onPress?: () => void; compact?: boolean}) {
  const c = useTheme();
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`Respuesta a ${reply.sender}: ${reply.text}`} disabled={!onPress} onPress={onPress}
    style={{borderLeftWidth: 3, borderLeftColor: reply.deleted ? c.border : c.primary, backgroundColor: c.bg + '66', borderRadius: 8, paddingHorizontal: 8, paddingVertical: compact ? 4 : 6}}>
    <Label numberOfLines={1} style={{fontSize: 11, fontWeight: '800', color: c.primaryText}}>{reply.sender}</Label>
    <Label numberOfLines={2} style={{fontSize: 12, color: c.muted, fontStyle: reply.deleted ? 'italic' : 'normal'}}>{reply.text}</Label>
  </Pressable>;
}

export function Reactions({message, me, onToggle}: {message: ChatMessage; me?: string; onToggle: (emoji: string) => void}) {
  const c = useTheme();
  const groups = summarizeReactions(message, me);
  if (!groups.length) return null;
  return <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 4}}>
    {groups.map(group => <Pressable key={group.emoji} accessibilityRole="button" accessibilityState={{selected: group.mine}}
      accessibilityLabel={`${group.emoji} ${group.count}: ${group.names.join(', ')}.${group.mine ? ' Toca para quitar tu reacción' : ' Toca para reaccionar igual'}`}
      onPress={() => onToggle(group.emoji)} hitSlop={6}
      style={{flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 30, paddingHorizontal: 8, borderRadius: 15, borderWidth: 1,
        borderColor: group.mine ? c.primary : c.border, backgroundColor: group.mine ? c.primary + '2A' : c.surfaceAlt}}>
      <Label style={{fontSize: 13}}>{group.emoji}</Label>
      <Label style={{fontSize: 11, fontWeight: '700', color: group.mine ? c.primaryText : c.muted}}>{group.count}</Label>
    </Pressable>)}
  </View>;
}

/** Full-screen photo with save/share; the backdrop follows the room palette instead of switching to pure black. */
export function ImageViewer({source, onClose, onSave}: {source: ImageSourcePropType; onClose: () => void; onSave?: () => void}) {
  const c = useTheme(); const insets = useSafeAreaInsets();
  return <Modal transparent animationType="fade" onRequestClose={onClose}>
    <View accessibilityViewIsModal style={{flex: 1, backgroundColor: c.bg + 'F5', paddingTop: insets.top, paddingBottom: insets.bottom}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', padding: 12}}>
        <IconButton icon="close" label="Cerrar foto" onPress={onClose}/>
        {onSave && <IconButton icon="share-outline" label="Guardar o compartir foto" onPress={onSave}/>}
      </View>
      <Image source={source} resizeMode="contain" accessibilityLabel="Foto enviada al chat" style={{flex: 1, width: '100%'}}/>
    </View>
  </Modal>;
}

export function DaySeparator({at}: {at: string}) {
  const c = useTheme();
  return <View accessibilityRole="header" style={{alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, backgroundColor: c.surfaceAlt, marginVertical: 2}}>
    <Muted style={{fontSize: 11, fontWeight: '700', textTransform: 'capitalize'}}>{dayLabel(at)}</Muted>
  </View>;
}

/** Message text with tappable https links (opened outside the app; never with a token). */
export function LinkedText({text}: {text: string}) {
  const c = useTheme();
  return <Label selectable style={{fontSize: 14}}>
    {linkParts(text).map((part, i) => part.url
      ? <Text key={i} accessibilityRole="link" onPress={() => void Linking.openURL(part.url!)} style={{color: c.primaryText, textDecorationLine: 'underline'}}>{part.text}</Text>
      : part.text)}
  </Label>;
}

/** Drag a bubble to the right to reply, like WhatsApp. Vertical scrolling wins as soon as the finger moves vertically. */
export function SwipeToReply({children, onReply, enabled, mine}: {children: ReactNode; onReply: () => void; enabled: boolean; mine: boolean}) {
  const c = useTheme();
  const offset = useSharedValue(0);
  const gesture = Gesture.Pan().enabled(enabled).runOnJS(true).activeOffsetX(14).failOffsetY([-10, 10])
    .onUpdate(event => {offset.value = Math.max(0, Math.min(80, event.translationX));})
    .onEnd(event => {
      if (event.translationX > 60) {onReply(); void Haptics.selectionAsync().catch(() => {});}
      offset.value = withSpring(0);
    })
    .onFinalize(() => {offset.value = withSpring(0);});
  const bubble = useAnimatedStyle(() => ({transform: [{translateX: offset.value}]}));
  const hint = useAnimatedStyle(() => ({opacity: Math.min(1, offset.value / 60)}));
  return <GestureDetector gesture={gesture}>
    <View style={{alignSelf: 'stretch', alignItems: mine ? 'flex-end' : 'flex-start'}}>
      <Reanimated.View pointerEvents="none" style={[{position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center'}, hint]}>
        <Ionicons name="arrow-undo" size={20} color={c.primaryText}/>
      </Reanimated.View>
      <Reanimated.View style={[{alignSelf: 'stretch', alignItems: mine ? 'flex-end' : 'flex-start'}, bubble]}>{children}</Reanimated.View>
    </View>
  </GestureDetector>;
}

/** Own message waiting for the server: «Enviando» (clock) or «No se envió» with retry / edit / discard. */
export function OutgoingBubble({item}: {item: Outgoing}) {
  const c = useTheme();
  const failed = item.status === 'failed';
  return <View style={{alignSelf: 'flex-end', maxWidth: '88%', gap: 6, alignItems: 'flex-end'}}>
    <View accessible accessibilityLabel={`Tu mensaje: ${item.text || attachmentLabel(item.attachments.map(x => ({...x, id: x.key, length: x.size})))}. ${failed ? 'No se envió. ' + (item.error ?? '') : 'Enviando'}`}
      style={{padding: 10, gap: 6, borderRadius: 16, borderTopRightRadius: 4, backgroundColor: c.accentSoft, opacity: failed ? 1 : .8, borderWidth: failed ? 1 : 0, borderColor: c.live}}>
      {item.replyTo && <Quote compact reply={{id: item.replyTo.id, sender: item.replyTo.sender, text: describeMessage(item.replyTo) || 'Adjunto', deleted: false}}/>}
      {item.attachments.map(x => <Muted key={x.key} style={{fontSize: 12}}>{x.kind === 'image' ? '📷 Foto' : x.kind === 'audio' ? `🎤 Nota de voz ${formatDuration(x.durationMs)}` : `📄 ${x.name}`}</Muted>)}
      {!!item.text && <Label style={{fontSize: 14}}>{item.text}</Label>}
      <View style={{flexDirection: 'row', gap: 4, alignItems: 'center', alignSelf: 'flex-end'}}>
        <Muted style={{fontSize: 10, color: failed ? c.live : c.muted}}>{failed ? 'No se envió' : 'Enviando'}</Muted>
        <Ionicons name={failed ? 'alert-circle' : 'time-outline'} size={13} color={failed ? c.live : c.muted}/>
      </View>
    </View>
    {failed && <View style={{flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end'}}>
      {!!item.error && <Muted style={{fontSize: 11, color: c.live, width: '100%', textAlign: 'right'}}>{item.error}</Muted>}
      <Chip label="Reintentar" icon="refresh" onPress={() => retryOutgoing(item.key)}/>
      <Chip label="Editar" icon="create-outline" onPress={() => reviseOutgoing(item.key)}/>
      <Chip label="Descartar" icon="trash-outline" onPress={() => discardOutgoing(item.key)}/>
    </View>}
  </View>;
}
