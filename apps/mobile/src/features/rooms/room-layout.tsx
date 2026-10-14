import { RoomQueue, RoomPeople } from "./room-panels";
import { RoomChat } from "./chat-panel";
import { useEffect, useState, type ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  useWindowDimensions,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { gradientStyle, useTheme } from "../../theme";
import { Ionicons } from "../../icons";
import { Button, IconButton, Label, Muted } from "../../ui";
import { MediaFrame, type MediaEvent } from "./media-frame";
import { MemberStack, RadioStage } from "./presentation";
import {OndaAmbientBackground, OndaReactionOverlay} from '../../components/experience';
import { StreamRoomStage } from "./stream";
import { YoutubeSearchBar } from "./youtube-bar";
import { useChatDraft } from "./chat-draft";
import {
  orderedQueue,
  projectedPosition,
  type ChatMessage,
  type Member,
  type Room,
} from "./types";

type Tab = "chat" | "queue" | "people";
export type RoomLayoutProps = {
  room: Room;
  frameRevision?: number;
  userId?: string;
  controller: boolean;
  connected: boolean;
  connection: string;
  tab: Tab;
  onTab: (tab: Tab) => void;
  busy: boolean;
  messages: ChatMessage[];
  votes: string[];
  mutedMembers: string[];
  audioMuted: boolean;
  /** Paused only on this device while a voice note records or plays. */
  ducked?: boolean;
  radioStatus: string;
  position: number;
  duration: number;
  desiredPosition: number;
  positionAt: number;
  mediaError: string;
  tapRequired: boolean;
  reaction: string;
  reactionRevision?: number;
  error: string;
  onEvent: (event: MediaEvent) => void;
  onPlayback: (playing: boolean, position: number) => void;
  toggleAudio: () => void;
  resync: () => void;
  saved: boolean;
  toggleSave: () => void;
  onMember: (member: Member) => void;
  /** Opens the YouTube explorer, optionally with a search already typed in the room. */
  onBrowseYoutube: (query?: string) => void;
  onSheet: (sheet: "add" | "invite" | "report" | "close" | "options") => void;
  act: (method: string, ...args: unknown[]) => Promise<boolean>;
  children?: ReactNode;
};




export function RoomLayout(p: RoomLayoutProps) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [theater, setTheater] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const shown = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKeyboard(true));
    const hidden = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboard(false));
    return () => {shown.remove(); hidden.remove();};
  }, []);
  const dimensions = useWindowDimensions();
  const wide = (Platform.OS === "web" ? dimensions.width >= 900 : dimensions.width >= 700 && dimensions.width > dimensions.height) && !theater;
  const StageContainer = wide ? ScrollView : View;
  const composing = useChatDraft((s) => s.composing);
  // Only while writing in the chat: the YouTube search bar lives in the stage and must stay visible.
  const typing = keyboard && composing && !wide && p.tab === "chat";
  // Subscription titles have no embedded player: the room's reference clock is the position.
  const current = () => p.room.media.kind === "stream" ? projectedPosition(p.desiredPosition, p.room.isPlaying, p.positionAt) : p.position;
  const contentLabel = p.room.media.kind === "youtube" ? "YouTube" : p.room.media.kind === "radio" ? "Buscar emisoras" : "Elegir contenido";
  const chooseContent = () => p.room.media.kind === "youtube" ? p.onBrowseYoutube() : p.onSheet("add");
  const owner = p.room.members.find((x) => x.id === p.room.ownerId);
  const isOwner = p.userId === p.room.ownerId;
  const queue = orderedQueue(p.room.queue);
  const exit = () =>
    router.canGoBack() ? router.back() : router.replace("/rooms");
  const next = queue[0];
  const ownTransport = p.room.media.kind === "radio" || p.room.media.kind === "stream";
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "web" ? undefined : "padding"}
      style={{ flex: 1 }}
    >
      <OndaAmbientBackground context={p.room.media.kind === 'radio' ? 'radio' : p.room.media.kind === 'audio' ? 'music' : 'social'}/>
      {/* padding-mode KeyboardAvoidingView overrides its own paddingBottom; keep the gesture inset inside it. */}
      <View style={{flex: 1, paddingBottom: keyboard ? 0 : insets.bottom}}>
      {/* Leave, room, search, people and settings stay visible without displacing the conversation. */}
      <View style={{ paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
        <IconButton icon="chevron-back" label="Salir de la vista de sala" plain onPress={exit} />
        <View style={{ flex: 1, gap: 2 }}>
          <Label numberOfLines={1} style={{ fontWeight: "800", fontSize: 16 }}>{p.room.name}</Label>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.connected ? c.primary : c.live }} />
            <Muted numberOfLines={1} style={{ fontSize: 11 }}>
              {p.connected ? (p.room.isPrivate ? "Privada" : "Pública") : p.connection === "reconnecting" ? "Volviendo a conectar…" : "Sin conexión"}
              {" · "}{p.controller ? (isOwner ? "Llevas el control" : "Coanfitrión") : owner ? `Controla ${owner.name}` : "Esperando al anfitrión"}
            </Muted>
          </View>
        </View>
        <IconButton icon="search" label={p.room.media.kind === "youtube" ? (p.controller ? "Buscar y cambiar el video" : "Buscar un video para proponer") : contentLabel}
          plain disabled={!p.connected || p.busy} onPress={chooseContent} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Personas en la sala: ${p.room.members.length}`}
          onPress={() => {setTheater(false); p.onTab("people");}}
          style={{ minWidth: 44, height: 44, paddingHorizontal: 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3 }}>
          <Ionicons name="people" size={22} color={c.text} />
          <Label style={{ fontSize: 12, fontWeight: "800" }}>{p.room.members.length}</Label>
        </Pressable>
        <IconButton icon="options-outline" label="Opciones de sala" plain onPress={() => p.onSheet("options")} />
      </View>
      <View
        style={{
          flex: 1,
          flexDirection: wide ? "row" : "column",
          gap: wide ? 12 : 0,
          paddingTop: wide ? 12 : 0,
        }}
      >
        {/* While writing in the chat on a phone the stage collapses (still mounted, so playback continues). */}
        <View style={wide ? { flex: 1.7 } : typing ? { height: 0, overflow: "hidden" } : undefined}>
          <StageContainer {...(wide ? {contentContainerStyle: {paddingHorizontal: 12, gap: 8}} : {style: {paddingHorizontal: 12, gap: 8}})}>
            <OndaReactionOverlay key={p.reactionRevision} emoji={p.reaction}/>
            {p.room.media.kind === "stream" ? (
              <StreamRoomStage media={p.room.media} playing={p.connected && p.room.isPlaying} position={p.desiredPosition} positionAt={p.positionAt}
                controller={p.controller} connected={p.connected} onPlayback={p.onPlayback} />
            ) : !p.room.media.url ? (
              <View style={{minHeight: 175, padding: 22, borderRadius: 24, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", gap: 10}}>
                <Ionicons name={p.room.media.kind === "youtube" ? "logo-youtube" : p.room.media.kind === "radio" ? "radio-outline" : "play-circle-outline"} size={44} color={c.primary} />
                <Label style={{fontSize: 20, fontWeight: "800"}}>Tu sala está lista</Label>
                <Muted style={{textAlign: "center"}}>{p.controller ? "Busca el contenido que quieres compartir." : "El anfitrión está eligiendo el contenido. Puedes proponer algo."}</Muted>
              </View>
            ) : p.room.media.kind === "radio" ? (
              <RadioStage media={p.room.media} status={p.radioStatus} />
            ) : (
              <MediaFrame
                key={`${p.room.media.url ?? p.room.media.kind}:${p.frameRevision ?? 0}`}
                media={p.room.media}
                host={p.controller}
                playing={p.connected && p.room.isPlaying}
                position={p.desiredPosition}
                positionAt={p.positionAt}
                revision={p.room.version}
                muted={p.audioMuted || !!p.ducked}
                onEvent={p.onEvent}
                theater={theater}
              />
            )}
            {p.mediaError ? (
              <View style={{ padding: 12, borderRadius: 14, backgroundColor: c.surface, gap: 8 }}>
                <Label accessibilityRole="alert" style={{ fontSize: 13 }}>{p.mediaError}</Label>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  {p.room.media.kind === "youtube" && (
                    <View style={{ flex: 1 }}>
                      <Button title={p.controller ? "Elegir otro video" : "Proponer otro video"} icon="search" onPress={() => p.onBrowseYoutube()} />
                    </View>
                  )}
                  {!!p.room.media.url && (
                    <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(p.room.media.url!)} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }}>
                      <Label style={{ color: c.primaryText, fontWeight: "700" }}>Abrir fuente</Label>
                    </Pressable>
                  )}
                </View>
              </View>
            ) : p.tapRequired ? (
              <Muted style={{ fontSize: 12, color: c.primaryText }}>Toca el reproductor para iniciar en este dispositivo.</Muted>
            ) : null}
            {/* Now playing: title and the few actions that matter (Rave-style). */}
            <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
              {p.controller && ownTransport && !!p.room.media.url && (
                <Pressable accessibilityRole="button" accessibilityLabel={p.room.isPlaying ? "Pausar para todos" : "Reproducir para todos"}
                  disabled={!p.connected || p.busy} onPress={() => p.onPlayback(!p.room.isPlaying, p.room.media.kind === "radio" ? 0 : current())}
                  style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...gradientStyle(c.brand, c.primary), opacity: p.connected ? 1 : 0.5, marginRight: 6 }}>
                  <Ionicons name={p.room.isPlaying ? "pause" : "play"} size={22} color={c.onPrimary} />
                </Pressable>
              )}
              <View style={{ flex: 1 }}>
                {!!p.room.media.url && <Muted style={{ fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>{p.connected ? p.room.isPlaying ? 'REPRODUCIENDO' : 'EN PAUSA' : 'SIN CONEXIÓN'}</Muted>}
                <Label numberOfLines={2} style={{ fontWeight: "800", fontSize: 14, lineHeight: 19 }}>{p.room.media.title}</Label>
              </View>
              {!!p.room.media.url && <IconButton icon={p.saved ? "heart" : "heart-outline"} tint={p.saved ? c.live : undefined} plain
                label={p.saved ? "Quitar de mi biblioteca" : "Guardar en mi biblioteca"} onPress={p.toggleSave} />}
              {p.controller && !!next && <IconButton icon="play-skip-forward" plain label={`Reproducir lo siguiente: ${next.media.title}`}
                disabled={!p.connected || p.busy} onPress={() => void p.act("PlayQueued", p.room.id, next.id)} />}
              <IconButton icon={p.audioMuted ? "volume-mute-outline" : "volume-high-outline"} plain
                label={p.audioMuted ? "Activar mi audio" : "Silenciar mi audio (solo en este dispositivo)"} onPress={p.toggleAudio} />
              {!ownTransport && !!p.room.media.url && (
                <IconButton icon={theater ? "contract-outline" : "expand-outline"} plain label={theater ? "Salir del modo cine" : "Modo cine"} onPress={() => setTheater((x) => !x)} />
              )}
            </View>
            {p.controller && p.room.media.kind === 'youtube' && p.room.media.url && Number.isFinite(p.duration) && p.duration > 0 && <View style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}>
              <IconButton icon="play-back-outline" plain label="Retroceder 10 segundos para todos" disabled={!p.connected || p.busy}
                onPress={() => p.onPlayback(p.room.isPlaying, Math.max(0, current() - 10))}/>
              <Muted style={{fontSize: 12, flex: 1, textAlign: 'center'}}>Control compartido · {Math.floor(current() / 60)}:{Math.floor(current() % 60).toString().padStart(2, '0')}</Muted>
              <IconButton icon="play-forward-outline" plain label="Avanzar 10 segundos para todos" disabled={!p.connected || p.busy}
                onPress={() => p.onPlayback(p.room.isPlaying, Math.min(p.duration, current() + 10))}/>
            </View>}
            {!!p.error && (
              <Muted accessibilityRole="alert" style={{ fontSize: 12, color: c.live }}>{p.error}</Muted>
            )}
            {p.room.media.kind === "youtube" && (
              <YoutubeSearchBar controller={p.controller} disabled={!p.connected || p.busy} onSearch={(query) => p.onBrowseYoutube(query)} />
            )}
            {p.room.media.kind !== "youtube" && !p.room.media.url && <Button title={contentLabel}
              secondary icon="add-outline"
              disabled={!p.connected || p.busy} onPress={chooseContent} />}
            {!keyboard && <View style={{flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 4}}><Pressable accessibilityRole="button" accessibilityLabel={`Ver ${p.room.members.length} participantes`} onPress={() => p.onTab('people')} style={{flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 44}}><MemberStack members={p.room.members} owner={p.room.ownerId}/><Muted style={{fontSize: 11}}>{p.room.members.length} {p.room.members.length === 1 ? 'persona' : 'personas'}</Muted></Pressable><IconButton icon="person-add-outline" label="Invitar a mis amigos" onPress={() => p.onSheet('invite')}/></View>}
          </StageContainer>
        </View>
        <View
          style={{
            flex: 1,
            ...(wide
              ? { maxWidth: 400, borderLeftWidth: 1, borderLeftColor: c.border }
              : undefined),
          }}
        >
          {theater ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                padding: 20,
              }}
            >
              <Muted style={{ textAlign: "center" }}>
                El momento sigue con {p.room.members.length}{" "}
                {p.room.members.length === 1 ? "persona" : "personas"}.
              </Muted>
              <Button
                title="Volver al chat"
                secondary
                icon="chatbubble-outline"
                onPress={() => {
                  setTheater(false);
                  p.onTab("chat");
                }}
              />
            </View>
          ) : (
            <>
              <View
                style={{
                  flexDirection: "row",
                  paddingHorizontal: 14,
                  paddingTop: 4,
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                  gap: 24,
                }}
              >
                {(
                  [
                    { key: "chat", name: "Chat" },
                    {
                      key: "queue",
                      name: `Siguiente${queue.length ? " · " + queue.length : ""}`,
                    },
                    { key: "people", name: "Personas" },
                  ] as const
                ).map((tab) => (
                  <Pressable
                    key={tab.key}
                    accessibilityRole="tab"
                    accessibilityLabel={tab.name}
                    accessibilityState={{ selected: p.tab === tab.key }}
                    onPress={() => p.onTab(tab.key)}
                    style={{
                      minHeight: 46,
                      justifyContent: "center",
                      borderBottomWidth: 2,
                      borderBottomColor:
                        p.tab === tab.key ? c.primary : "transparent",
                    }}
                  >
                    <Label
                      style={{
                        fontSize: 13,
                        fontWeight: "800",
                        color: p.tab === tab.key ? c.text : c.muted,
                      }}
                    >
                      {tab.name}
                    </Label>
                  </Pressable>
                ))}
              </View>
              {p.tab === "chat" ? (
                <RoomChat {...p} />
              ) : p.tab === "queue" ? (
                <RoomQueue {...p} />
              ) : (
                <RoomPeople {...p} />
              )}
            </>
          )}
        </View>
      </View>
      {p.children}
      </View>
    </KeyboardAvoidingView>
  );
}
