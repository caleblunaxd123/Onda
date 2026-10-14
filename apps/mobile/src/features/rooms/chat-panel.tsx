import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AccessibilityInfo, ActivityIndicator, FlatList, Image, Platform, Pressable, TextInput, View, type ImageSourcePropType} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {useTheme} from '../../theme';
import {Ionicons} from '../../icons';
import {ActionRow, Chip, Label, Muted, Sheet, type IconName} from '../../ui';
import {Avatar} from './presentation';
import {canDelete, canEdit, chatLimits, continuesGroup, describeMessage, emojiPanel, formatBytes, formatDuration, isJumboEmoji, myReaction, pruneTyping, sameDay, typingLabel} from './chat';
import {addAttachment, ensureDraftRoom, removeAttachment, replyTo, retryAttachment, sendDraft, setComposing, setDraftText, startEditing, stopEditing, useChatDraft,
  type PendingAttachment} from './chat-draft';
import {discardLocal, saveAttachment, voiceAttachmentAsync} from './chat-files';
import {ChatImage, DaySeparator, FileCard, ImageViewer, LinkedText, OutgoingBubble, Quote, Reactions, SwipeToReply, VoiceBar, VoiceNote} from './chat-parts';
import {deleteChat, loadOlderMessages, notifyTyping, reactChat, useHiddenMessages, useRoom} from './client';
import {useVoiceRecorder, type VoiceClip} from './voice';
import type {RoomLayoutProps} from './room-layout';
import type {ChatAttachment, ChatMessage} from './types';

const quickEmoji = ['❤️', '🔥', '👏', '😂', '😮', '🎵'];
const time = (at: string) => new Date(at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

export function RoomChat(p: RoomLayoutProps) {
  const c = useTheme();
  const room = p.room.id;
  const owner = p.userId === p.room.ownerId;
  const hidden = useHiddenMessages(s => s.ids);
  const {typing, olderAvailable, loadingOlder} = useRoom();
  const data = useMemo(() => p.messages.filter(x => !hidden.includes(x.id)), [p.messages, hidden]);
  const outbox = useChatDraft(s => s.outbox);
  const list = useRef<FlatList<ChatMessage>>(null);
  const follow = useRef(true);
  const [away, setAway] = useState(false);
  const [selected, setSelected] = useState<ChatMessage | null>(null);
  const [viewer, setViewer] = useState<{source: ImageSourcePropType; item: ChatAttachment} | null>(null);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {ensureDraftRoom(room);}, [room]);
  // Re-render while someone is typing so the indicator expires on time even without new events.
  useEffect(() => {
    if (!Object.keys(typing).length) return;
    const timer = setInterval(() => {setNow(Date.now()); const next = pruneTyping(useRoom.getState().typing); if (next !== useRoom.getState().typing) useRoom.setState({typing: next});}, 1000);
    return () => clearInterval(timer);
  }, [typing]);
  const typingText = typingLabel(typing, [...p.mutedMembers, p.userId ?? ''], now);
  const fail = useCallback((message: string) => {setNotice(message); AccessibilityInfo.announceForAccessibility?.(message);}, []);
  const react = (message: ChatMessage, emoji: string) => {void reactChat(message.id, emoji).catch((e: Error) => fail(e.message));};
  const jumpTo = (id: string) => {
    const index = data.findIndex(x => x.id === id);
    if (index >= 0) list.current?.scrollToIndex({index, animated: true, viewPosition: .3});
    else fail('Ese mensaje es anterior a lo cargado. Usa «Ver mensajes anteriores».');
  };
  const renderMessage = ({item, index}: {item: ChatMessage; index: number}) => {
    const previous = data[index - 1];
    const separator = !previous || !sameDay(previous.at, item.at) ? <DaySeparator at={item.at}/> : null;
    if (item.kind === 'system') return <>{separator}<Muted style={{textAlign: 'center', fontSize: 11, padding: 8}}>{item.text}</Muted></>;
    const mine = item.senderId === p.userId;
    const grouped = !separator && continuesGroup(previous, item);
    const description = describeMessage(item);
    return <>{separator}<SwipeToReply enabled={!item.deleted} mine={mine} onReply={() => replyTo(item)}>
      <View style={{alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '88%', flexDirection: 'row', gap: 7, marginTop: grouped ? -8 : 0}}>
        {!mine && (grouped ? <View style={{width: 26}}/> : <Avatar member={{id: item.senderId, name: item.sender}} size={26}/>)}
        <View style={{gap: 4, alignItems: mine ? 'flex-end' : 'flex-start', flexShrink: 1}}>
          {/* Not one big button: quote, photo, voice note, file and links stay individually reachable (TalkBack, web). */}
          <View style={{padding: 10, gap: 6, borderRadius: 16, borderTopLeftRadius: mine || grouped ? 16 : 4, borderTopRightRadius: mine && !grouped ? 4 : 16,
            backgroundColor: item.deleted ? 'transparent' : mine ? c.accentSoft : c.surface, borderWidth: item.deleted ? 1 : 0, borderColor: c.border}}>
            {!grouped && !mine && <Label style={{fontSize: 11, fontWeight: '800', color: c.primaryText}}>{item.sender}</Label>}
            {item.deleted ? <View style={{flexDirection: 'row', gap: 6, alignItems: 'center'}}>
              <Ionicons name="trash-outline" size={14} color={c.muted}/>
              <Muted style={{fontStyle: 'italic', fontSize: 13}}>Mensaje eliminado</Muted>
            </View> : <>
              {item.reply && <Quote reply={item.reply} onPress={() => jumpTo(item.reply!.id)}/>}
              {(item.attachments ?? []).map(attachment => attachment.kind === 'image'
                ? <ChatImage key={attachment.id} room={room} item={attachment} onOpen={source => setViewer({source, item: attachment})} onLongPress={() => setSelected(item)}/>
                : attachment.kind === 'audio' ? <VoiceNote key={attachment.id} room={room} item={attachment} mine={mine} onLongPress={() => setSelected(item)}/>
                : <FileCard key={attachment.id} room={room} item={attachment} onError={fail} onLongPress={() => setSelected(item)}/>)}
              {!!item.text && (isJumboEmoji(item.text) && !item.attachments?.length
                ? <Label onLongPress={() => setSelected(item)} style={{fontSize: 46, lineHeight: 56}}>{item.text.trim()}</Label>
                : <LinkedText text={item.text} onLongPress={() => setSelected(item)}/>)}
            </>}
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setSelected(item)} onLongPress={() => setSelected(item)}
              accessibilityLabel={`${mine ? 'Tú' : item.sender}, ${time(item.at)}: ${description}${item.editedAt ? '. Editado' : ''}${mine && !item.deleted ? '. Enviado' : ''}`}
              accessibilityHint="Abre opciones: reaccionar, responder, editar o eliminar"
              style={{flexDirection: 'row', gap: 4, alignItems: 'center', alignSelf: 'flex-end', minHeight: 20}}>
              <Muted style={{fontSize: 10}}>{item.editedAt ? 'Editado · ' : ''}{time(item.at)}</Muted>
              {mine && !item.deleted && <Ionicons name="checkmark" size={13} color={c.muted}/>}
              <Ionicons name="chevron-down" size={12} color={c.muted}/>
            </Pressable>
          </View>
          {!item.deleted && <Reactions message={item} me={p.userId} onToggle={emoji => react(item, emoji)}/>}
        </View>
      </View>
    </SwipeToReply></>;
  };
  return <>
    <FlatList ref={list} data={data} keyExtractor={item => item.id} renderItem={renderMessage}
      contentContainerStyle={{padding: 14, gap: 12, flexGrow: 1}} keyboardShouldPersistTaps="handled"
      maintainVisibleContentPosition={Platform.OS === 'web' ? undefined : {minIndexForVisible: 0}}
      onContentSizeChange={() => {if (follow.current) list.current?.scrollToEnd({animated: true});}}
      onScrollToIndexFailed={info => list.current?.scrollToOffset({offset: info.averageItemLength * info.index, animated: true})}
      onScroll={e => {
        const {layoutMeasurement, contentOffset, contentSize} = e.nativeEvent;
        const bottom = contentSize.height - contentOffset.y - layoutMeasurement.height < 60;
        follow.current = bottom; setAway(!bottom);
      }}
      scrollEventThrottle={100}
      ListHeaderComponent={olderAvailable ? <View style={{alignItems: 'center', paddingBottom: 4}}>
        {loadingOlder ? <ActivityIndicator color={c.primary}/> : <Chip label="Ver mensajes anteriores" icon="time-outline"
          onPress={() => {follow.current = false; void loadOlderMessages().catch((e: Error) => fail(e.message));}}/>}
      </View> : null}
      ListFooterComponent={outbox.length ? <View style={{gap: 8, paddingTop: data.length ? 12 : 0}}>
        {outbox.map(item => <OutgoingBubble key={item.key} item={item}/>)}
      </View> : null}
      ListEmptyComponent={<View style={{flex: 1, minHeight: 90, alignItems: 'center', justifyContent: 'center', gap: 8}}>
        <Ionicons name="chatbubbles-outline" size={28} color={c.muted}/>
        <Label style={{fontWeight: '700'}}>Aquí empieza el momento.</Label>
        <Muted style={{fontSize: 12, textAlign: 'center'}}>Escribe, manda un sticker o graba una nota de voz.</Muted>
      </View>}/>
    {away && <View style={{alignItems: 'center', paddingBottom: 6}}>
      <Chip label="Últimos mensajes" icon="arrow-down" onPress={() => {follow.current = true; setAway(false); list.current?.scrollToEnd({animated: true});}}/>
    </View>}
    {!!typingText && <Muted accessibilityLiveRegion="polite" style={{fontSize: 11, paddingHorizontal: 18, paddingBottom: 2}}>{typingText}</Muted>}
    {!!notice && <Pressable accessibilityRole="button" accessibilityLabel={`${notice}. Cerrar aviso`} onPress={() => setNotice('')}
      style={{marginHorizontal: 14, marginBottom: 4, padding: 10, borderRadius: 12, backgroundColor: c.surfaceAlt, flexDirection: 'row', gap: 8, alignItems: 'center'}}>
      <Ionicons name="alert-circle-outline" size={16} color={c.live}/><Label style={{flex: 1, fontSize: 12}}>{notice}</Label><Ionicons name="close" size={16} color={c.muted}/>
    </Pressable>}
    <Composer {...p} onError={fail}/>
    {selected && <MessageActions message={selected} me={p.userId} owner={owner} onClose={() => setSelected(null)} onError={fail}
      onMember={() => {setSelected(null); p.onMember({id: selected.senderId, name: selected.sender});}}/>}
    {viewer && <ImageViewer source={viewer.source} onClose={() => setViewer(null)}
      onSave={() => void saveAttachment(room, viewer.item).catch((e: Error) => fail(e.message))}/>}
  </>;
}

function MessageActions({message, me, owner, onClose, onError, onMember}: {message: ChatMessage; me?: string; owner: boolean; onClose: () => void; onError: (m: string) => void; onMember: () => void}) {
  const c = useTheme();
  const mine = message.senderId === me;
  const current = myReaction(message, me);
  const run = (action: () => Promise<unknown>) => {onClose(); void action().catch((e: Error) => onError(e.message));};
  return <Sheet title={mine ? 'Tu mensaje' : `Mensaje de ${message.sender}`} onClose={onClose}>
    {!message.deleted && <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 4}}>
      {quickEmoji.map(emoji => <Pressable key={emoji} accessibilityRole="button" accessibilityState={{selected: current === emoji}}
        accessibilityLabel={current === emoji ? `Quitar reacción ${emoji}` : `Reaccionar con ${emoji}`}
        onPress={() => run(() => reactChat(message.id, emoji))}
        style={{width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: current === emoji ? c.primary + '33' : c.surface,
          borderWidth: 1, borderColor: current === emoji ? c.primary : c.border}}>
        <Label style={{fontSize: 22}}>{emoji}</Label>
      </Pressable>)}
    </View>}
    {!message.deleted && <ActionRow icon="arrow-undo-outline" label="Responder" onPress={() => {replyTo(message); onClose();}}/>}
    {canEdit(message, me) && <ActionRow icon="create-outline" label="Editar" detail="Hasta 15 min" onPress={() => {startEditing(message); onClose();}}/>}
    {!message.deleted && !!message.text && <ActionRow icon="copy-outline" label="Copiar texto" onPress={() => {void Clipboard.setStringAsync(message.text); onClose();}}/>}
    {canDelete(message, me, owner) && <ActionRow icon="trash-outline" label={mine ? 'Eliminar para todos' : 'Eliminar para todos (moderación)'}
      onPress={() => run(() => deleteChat(message.id))}/>}
    <ActionRow icon="eye-off-outline" label="Eliminar para mí" detail="Solo en este dispositivo" onPress={() => {useHiddenMessages.getState().hide(message.id); onClose();}}/>
    {!mine && <ActionRow icon="person-outline" label={`Opciones de ${message.sender}`} onPress={onMember}/>}
  </Sheet>;
}

function Composer(p: RoomLayoutProps & {onError: (message: string) => void}) {
  const c = useTheme();
  const draft = useChatDraft();
  const [menu, setMenu] = useState(false);
  const discardClip = useCallback((clip: VoiceClip) => discardLocal({uri: clip.uri, temporary: true}), []);
  const voice = useVoiceRecorder(discardClip);
  const text = draft.text;
  const uploading = draft.pending.some(x => x.status === 'uploading');
  const canSend = p.connected && !draft.sending && (!!text.trim() || draft.pending.length > 0 || (!!draft.editing && !!draft.editing.attachments?.length));
  const sendVoice = async () => {
    const clip = voice.take(); if (!clip) return;
    try {addAttachment(await voiceAttachmentAsync(clip.uri, clip.durationMs), true);}
    catch {discardClip(clip); p.onError('No se pudo preparar la nota de voz.');}
  };
  if (voice.phase === 'recording' || voice.phase === 'starting' || voice.phase === 'review') {
    const review = voice.phase === 'review' && voice.clip;
    return <View style={{paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10, gap: 8}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border}}>
        <RoundButton icon="trash-outline" label={review ? 'Descartar nota de voz' : 'Cancelar grabación'} onPress={() => void voice.cancel()} tint={c.live}/>
        {review ? <View style={{flex: 1}}><VoiceBar id={'local:' + review.uri} durationMs={review.durationMs} source={async () => review.uri}/></View>
          : <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8}} accessibilityLiveRegion="polite">
            <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: c.live}}/>
            <Label style={{fontVariant: ['tabular-nums'], fontWeight: '700'}}>{formatDuration(voice.duration)}</Label>
            <Muted style={{fontSize: 11}}>/ {formatDuration(chatLimits.voiceSeconds * 1000)} · Solo tú dejas de oír la sala</Muted>
          </View>}
        {review ? <RoundButton icon="arrow-up" label="Enviar nota de voz" primary disabled={!p.connected} onPress={() => void sendVoice()}/>
          : <RoundButton icon="stop" label="Terminar grabación" primary disabled={voice.phase === 'starting'} onPress={() => void voice.stop()}/>}
      </View>
    </View>;
  }
  return <View style={{paddingHorizontal: 14, paddingTop: 4, paddingBottom: 10, gap: 8}}>
    {(draft.replyTo || draft.editing) && <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
      <Ionicons name={draft.editing ? 'create-outline' : 'arrow-undo-outline'} size={18} color={c.primaryText}/>
      <View style={{flex: 1}}>
        {draft.editing ? <Label style={{fontSize: 12, fontWeight: '700'}}>Editando tu mensaje</Label>
          : <Quote compact reply={{id: draft.replyTo!.id, sender: draft.replyTo!.sender, text: describeMessage(draft.replyTo!) || 'Adjunto', deleted: false}}/>}
      </View>
      <RoundButton icon="close" label={draft.editing ? 'Cancelar edición' : 'Cancelar respuesta'} onPress={() => draft.editing ? stopEditing() : replyTo(null)}/>
    </View>}
    {draft.pending.length > 0 && <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
      {draft.pending.map(item => <PendingChip key={item.key} item={item}/>)}
    </View>}
    {!!draft.error && <Label accessibilityRole="alert" style={{fontSize: 12, color: c.live}}>{draft.error}</Label>}
    {!!voice.error && <Pressable accessibilityRole="button" onPress={voice.clearError}><Label accessibilityRole="alert" style={{fontSize: 12, color: c.live}}>{voice.error}</Label></Pressable>}
    {menu && <View style={{gap: 8, padding: 10, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border}}>
      <Muted style={{fontSize: 11, fontWeight: '700'}}>EMOJIS Y STICKERS · solos se ven en grande</Muted>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'}}>
        {emojiPanel.map(emoji => <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`Añadir ${emoji}`}
          onPress={() => setDraftText((useChatDraft.getState().text + emoji).slice(0, chatLimits.text))}
          style={({pressed}) => ({width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: pressed ? c.surfaceAlt : 'transparent'})}>
          <Label style={{fontSize: 24}}>{emoji}</Label>
        </Pressable>)}
      </View>
      <Muted style={{fontSize: 11, fontWeight: '700'}}>REACCIÓN FLOTANTE PARA LA SALA</Muted>
      <View style={{flexDirection: 'row', gap: 4}}>
        {['❤️', '🔥', '👏', '😂', '😮', '🎵'].map(emoji => <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`Reacción flotante ${emoji} para la sala`}
          disabled={!p.connected} onPress={() => {setMenu(false); void p.act('React', p.room.id, emoji);}}
          style={{minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center'}}><Label style={{fontSize: 22}}>{emoji}</Label></Pressable>)}
      </View>
    </View>}
    <View style={{flexDirection: 'row', gap: 8, alignItems: 'flex-end'}}>
      {!draft.editing && <RoundButton icon={menu ? 'close' : 'happy-outline'} label={menu ? 'Cerrar emojis' : 'Emojis, stickers y reacciones'} onPress={() => setMenu(x => !x)}/>}
      <TextInput accessibilityLabel={draft.editing ? 'Editar mensaje' : 'Mensaje para la sala'} value={text}
        onChangeText={value => {setDraftText(value); if (value.trim()) notifyTyping();}}
        onFocus={() => setComposing(true)} onBlur={() => setComposing(false)}
        placeholder={draft.editing ? 'Edita tu mensaje' : 'Escribe a la sala…'} placeholderTextColor={c.muted} maxLength={chatLimits.text} multiline
        style={{flex: 1, minHeight: 46, maxHeight: 120, borderWidth: 1, borderColor: c.border, borderRadius: 24, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
          backgroundColor: c.surface, color: c.text, fontSize: 14}}/>
      {canSend || draft.editing || draft.pending.length
        ? <RoundButton icon={draft.editing ? 'checkmark' : 'arrow-up'} primary busy={draft.sending || (draft.autoSend && uploading)}
          label={draft.editing ? 'Guardar edición' : uploading ? 'Enviar cuando termine de subir' : 'Enviar mensaje'} disabled={!canSend} onPress={() => void sendDraft()}/>
        : <RoundButton icon="mic-outline" label="Grabar nota de voz" disabled={!p.connected} onPress={() => void voice.start()}/>}
    </View>
    {text.length > chatLimits.text - 200 && <Muted style={{fontSize: 11, alignSelf: 'flex-end'}}>{text.length}/{chatLimits.text}</Muted>}
    {!!p.reaction && <Label accessibilityLiveRegion="polite" style={{position: 'absolute', right: 20, top: -36, fontSize: 28}}>{p.reaction}</Label>}
  </View>;
}

function PendingChip({item}: {item: PendingAttachment}) {
  const c = useTheme();
  const label = item.kind === 'image' ? 'Foto' : item.kind === 'audio' ? `Nota de voz ${formatDuration(item.durationMs)}` : item.name;
  return <View accessible accessibilityLabel={`${label}, ${formatBytes(item.size)}. ${item.status === 'uploading' ? `Subiendo ${Math.round(item.progress * 100)}%` : item.status === 'error' ? item.error : 'Listo para enviar'}`}
    style={{flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, paddingRight: 2, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1,
      borderColor: item.status === 'error' ? c.live : c.border, maxWidth: '100%'}}>
    {item.kind === 'image' ? <Image source={{uri: item.uri}} style={{width: 44, height: 44, borderRadius: 10}}/>
      : <View style={{width: 44, height: 44, borderRadius: 10, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center'}}>
        <Ionicons name={item.kind === 'audio' ? 'mic-outline' : 'document-outline'} size={20} color={c.primaryText}/>
      </View>}
    <View style={{maxWidth: 150}}>
      <Label numberOfLines={1} style={{fontSize: 12, fontWeight: '700'}}>{label}</Label>
      <Muted numberOfLines={2} style={{fontSize: 10, color: item.status === 'error' ? c.live : c.muted}}>
        {item.status === 'uploading' ? `Subiendo ${Math.round(item.progress * 100)}%` : item.status === 'error' ? item.error : formatBytes(item.size)}
      </Muted>
    </View>
    {item.status === 'error' && <RoundButton icon="refresh" label="Reintentar subida" small onPress={() => retryAttachment(item.key)}/>}
    <RoundButton icon="close" label={item.status === 'uploading' ? 'Cancelar subida' : 'Quitar adjunto'} small onPress={() => removeAttachment(item.key)}/>
  </View>;
}

function RoundButton({icon, label, onPress, primary, disabled, busy, tint, small}: {icon: IconName; label: string; onPress: () => void;
  primary?: boolean; disabled?: boolean; busy?: boolean; tint?: string; small?: boolean}) {
  const c = useTheme(); const size = small ? 44 : 46;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled: !!disabled, busy: !!busy}} disabled={disabled || busy} onPress={onPress}
    style={({pressed}) => ({width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', opacity: disabled ? .45 : pressed ? .7 : 1,
      backgroundColor: small ? 'transparent' : primary ? c.primary : c.surfaceAlt})}>
    {busy ? <ActivityIndicator color={primary ? c.onPrimary : c.primary}/> : <Ionicons name={icon} size={small ? 18 : 22} color={tint ?? (primary ? c.onPrimary : c.text)}/>}
  </Pressable>;
}
