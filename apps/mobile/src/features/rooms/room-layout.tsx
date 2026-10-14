import {SeekBar} from "./seek-bar";
import { RoomQueue, RoomPeople } from "./room-panels";
import { RoomChat } from "./chat-panel";
import { useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  useWindowDimensions,
  Linking,
  Platform,
  Pressable,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme";
import { Ionicons } from "../../icons";
import { Button, IconButton, Label, Muted } from "../../ui";
import { MediaFrame, type MediaEvent } from "./media-frame";
import { MemberStack, RadioStage } from "./presentation";
import { StreamStage } from "./stream";
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
  error: string;
  onEvent: (event: MediaEvent) => void;
  onPlayback: (playing: boolean, position: number) => void;
  toggleAudio: () => void;
  resync: () => void;
  saved: boolean;
  toggleSave: () => void;
  onMember: (member: Member) => void;
  onBrowseYoutube: () => void;
  onSheet: (sheet: "add" | "invite" | "report" | "close") => void;
  act: (method: string, ...args: unknown[]) => Promise<boolean>;
  children?: ReactNode;
};




export function RoomLayout(p: RoomLayoutProps) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [theater, setTheater] = useState(false);
  const dimensions = useWindowDimensions();
  const wide = Platform.OS === "web" && dimensions.width >= 900 && !theater;
  const owner = p.room.members.find((x) => x.id === p.room.ownerId);
  const isOwner = p.userId === p.room.ownerId;
  const queue = orderedQueue(p.room.queue);
  // Subscription titles have no embedded player: the room clock is the position.
  const current = () => p.room.media.kind === "stream" ? projectedPosition(p.desiredPosition, p.room.isPlaying, p.positionAt) : p.position;
  const exit = () =>
    router.canGoBack() ? router.back() : router.replace("/rooms");
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: c.bg, paddingBottom: insets.bottom }}
    >
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <IconButton
          icon="chevron-back"
          label="Salir de la vista de sala"
          onPress={exit}
        />
        <View style={{ flex: 1, gap: 3 }}>
          <Label numberOfLines={1} style={{ fontWeight: "800", fontSize: 17 }}>
            {p.room.name}
          </Label>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Ionicons
              name={p.room.isPrivate ? "lock-closed" : "earth"}
              size={10}
              color={c.muted}
            />
            <Muted style={{ fontSize: 11 }}>
              {p.room.isPrivate ? "Solo tu gente" : "Sala pública"} ·{" "}
              {p.room.members.length}{" "}
              {p.room.members.length === 1 ? "persona" : "personas"}
            </Muted>
          </View>
        </View>
        <IconButton
          icon="link-outline"
          label="Invitar amigos"
          onPress={() => p.onSheet("invite")}
        />
      </View>
      <View
        style={{
          flex: 1,
          flexDirection: wide ? "row" : "column",
          gap: wide ? 12 : 0,
          paddingTop: wide ? 12 : 0,
        }}
      >
        <View style={wide ? { flex: 1.7 } : undefined}>
          <View style={{ paddingHorizontal: 14, gap: 9 }}>
            {!p.room.media.url ? (
              <View style={{minHeight: 190, padding: 22, borderRadius: 20, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", gap: 10}}>
                <Ionicons name={p.room.media.kind === "youtube" ? "logo-youtube" : p.room.media.kind === "radio" ? "radio-outline" : p.room.media.kind === "stream" ? "tv-outline" : "play-circle-outline"} size={44} color={c.primary} />
                <Label style={{fontSize: 20, fontWeight: "800"}}>Tu sala está lista</Label>
                <Muted style={{textAlign: "center"}}>{p.controller ? "Busca el contenido que quieres compartir." : "El anfitrión está eligiendo el contenido. Puedes proponer algo en la cola."}</Muted>
              </View>
            ) : p.room.media.kind === "radio" ? (
              <RadioStage media={p.room.media} status={p.radioStatus} />
            ) : p.room.media.kind === "stream" ? (
              <StreamStage media={p.room.media} playing={p.connected && p.room.isPlaying} position={p.desiredPosition} positionAt={p.positionAt}
                controller={p.controller} connected={p.connected} onPlayback={p.onPlayback} />
            ) : (
              <MediaFrame
              key={`${p.room.media.url ?? p.room.media.kind}:${p.frameRevision ?? 0}`}
                media={p.room.media}
                host={p.controller}
                playing={p.connected && p.room.isPlaying}
                position={p.desiredPosition}
              positionAt={p.positionAt}
                muted={p.audioMuted || !!p.ducked}
                onEvent={p.onEvent}
                theater={theater}
              />
            )}
            {p.mediaError ? (
              <View
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: c.surface,
                  gap: 6,
                }}
              >
                <Muted accessibilityRole="alert">{p.mediaError}</Muted>
                {p.room.media.url && (
                  <Button
                    title="Abrir fuente"
                    secondary
                    icon="open-outline"
                    onPress={() => void Linking.openURL(p.room.media.url!)}
                  />
                )}
              </View>
            ) : p.tapRequired ? (
              <Muted style={{ fontSize: 12, color: c.primaryText }}>
                Toca el reproductor para iniciar en este dispositivo.
              </Muted>
            ) : null}
            <View
              style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Label
                  numberOfLines={1}
                  style={{ fontWeight: "800", fontSize: 15 }}
                >
                  {p.room.media.title}
                </Label>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: p.connected ? c.primary : c.live,
                    }}
                  />
                  <Muted style={{ fontSize: 11 }}>
                    {p.connected
                      ? "Conectados"
                      : p.connection === "reconnecting"
                        ? "Volviendo a conectar…"
                        : "Sin conexión"}{" "}
                    ·{" "}
                    {p.controller
                      ? isOwner
                        ? "Llevas el control"
                        : "Coanfitrión"
                      : owner
                        ? `${owner.name} lleva el control`
                        : p.room.autoRecovery
                          ? "El control se recupera tras 60 s"
                          : "Esperando al anfitrión"}
                  </Muted>
                </View>
              </View>
              {!!p.room.media.url && <IconButton
                icon={p.saved ? "bookmark" : "bookmark-outline"}
                label="Guardar o quitar contenido"
                onPress={p.toggleSave}
              />}
              {p.room.media.kind !== "radio" && p.room.media.kind !== "stream" && !!p.room.media.url && (
                <IconButton
                  icon={theater ? "contract-outline" : "expand-outline"}
                  label={theater ? "Salir del modo cine" : "Modo cine"}
                  onPress={() => setTheater((x) => !x)}
                />
              )}
            </View>
            {p.room.media.kind !== "radio" && p.room.media.kind !== "stream" && !!p.room.media.url && (
              <SeekBar
                position={p.position}
                duration={p.duration}
                enabled={p.controller && p.connected}
                seek={(position) => p.onPlayback(p.room.isPlaying, position)}
              />
            )}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 2,
              }}
            >
              {p.controller && !!p.room.media.url && (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      p.room.isPlaying
                        ? "Pausar para todos"
                        : "Reproducir para todos"
                    }
                    disabled={!p.connected || p.busy}
                    onPress={() =>
                      p.onPlayback(
                        !p.room.isPlaying,
                        p.room.media.kind === "radio" ? 0 : current(),
                      )
                    }
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: c.primary,
                      opacity: p.connected ? 1 : 0.5,
                    }}
                  >
                    <Ionicons
                      name={p.room.isPlaying ? "pause" : "play"}
                      size={24}
                      color={c.onPrimary}
                    />
                  </Pressable>
                  {p.room.media.kind !== "radio" && (
                    <>
                      <IconButton
                        icon="play-back-outline"
                        label="Retroceder 15 segundos"
                        onPress={() =>
                          p.onPlayback(
                            p.room.isPlaying,
                            Math.max(0, current() - 15),
                          )
                        }
                      />
                      <IconButton
                        icon="play-forward-outline"
                        label="Avanzar 15 segundos"
                        onPress={() =>
                          p.onPlayback(p.room.isPlaying, current() + 15)
                        }
                      />
                    </>
                  )}
                </>
              )}
              <IconButton
                icon={
                  p.audioMuted ? "volume-mute-outline" : "volume-high-outline"
                }
                label={p.audioMuted ? "Activar mi audio" : "Silenciar mi audio"}
                onPress={p.toggleAudio}
              />
              <IconButton
                icon="sync-outline"
                label="Volver a sincronizar"
                onPress={p.resync}
              />
              <View style={{ flex: 1 }} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver personas de la sala"
                onPress={() => {
                  setTheater(false);
                  p.onTab("people");
                }}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <MemberStack
                  members={p.room.members}
                  owner={p.room.ownerId}
                  max={p.controller ? 1 : 3}
                />
              </Pressable>
            </View>
            {!!p.error && (
              <Muted
                accessibilityRole="alert"
                style={{ fontSize: 12, color: c.live }}
              >
                {p.error}
              </Muted>
            )}
            <Button title={p.room.media.kind === "youtube" ? "YouTube" : p.room.media.kind === "radio" ? "Buscar emisoras" : "Elegir contenido"}
              secondary icon={p.room.media.kind === "youtube" ? "logo-youtube" : "add-outline"}
              disabled={!p.connected || p.busy} onPress={() => p.room.media.kind === "youtube" ? p.onBrowseYoutube() : p.onSheet("add")} />
          </View>
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
                  paddingTop: 12,
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
    </KeyboardAvoidingView>
  );
}
