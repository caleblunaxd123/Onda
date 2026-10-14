import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Linking, Share, View } from "react-native";
import {
  router,
  useLocalSearchParams,
  useFocusEffect,
  useIsFocused,
} from "expo-router";
import { useTheme } from "../../theme";
import * as Clipboard from "expo-clipboard";
import { useLibrary } from "../../library";
import { usePlayer } from "../../player";
import {
  Button,
  Card,
  EmptyState,
  Label,
  Loading,
  Muted,
  Page,
  ScreenHeader,
  Sheet,
  ActionRow,
} from "../../ui";
import { FormField } from "../../components/forms";
import { accountRequest, ensureListener, useAuth } from "../account/session";
import {
  enterRoom,
  leaveRoom,
  muteMember,
  refreshRoom,
  roomCommand,
  toggleRoomAudio,
  useRoom,
} from "./client";
import type { MediaEvent } from "./media-frame";
import { RoomLayout } from "./room-layout";
import { SourcePicker } from "./source-picker";
import { youtubeVideoUrl } from "./youtube-navigation";
import {
  orderedQueue,
  playbackPosition,
  type MediaInput,
  type Member,
  type Room,
} from "./types";

export default function RoomScreen() {
  const c = useTheme();
  const auth = useAuth();
  const state = useRoom();
  const library = useLibrary();
  const nativePlayback = usePlayer();
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ id?: string; code?: string; choose?: string }>();
  const initialProvider = ["youtube", "radio", "audio", "video"].includes(params.choose ?? "") ? params.choose as MediaInput["kind"] : undefined;
  const [startupPicker, setStartupPicker] = useState(!!initialProvider);
  const [openYoutube, setOpenYoutube] = useState(initialProvider === "youtube");
  const [directSelection, setDirectSelection] = useState(!!initialProvider);
  const id = typeof params.id === "string" ? params.id : "";
  const code = typeof params.code === "string" ? params.code : "";
  const [name, setName] = useState("");
  const [bootError, setBootError] = useState("");
  const [joining, setJoining] = useState(false);
  const [retry, setRetry] = useState(0);
  const [tab, setTab] = useState<"chat" | "queue" | "people">("chat");
  const [text, setText] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<
    "add" | "invite" | "report" | "close" | null
  >(initialProvider ? "add" : null);
  const [member, setMember] = useState<Member | null>(null);
  const [copied, setCopied] = useState("");
  const [input, setInput] = useState<MediaInput>({ kind: initialProvider ?? "video" });
  const [reason, setReason] = useState("");
  const [mediaFailure, setMediaFailure] = useState({ source: "", message: "" });
  const [tapSource, setTapSource] = useState("");
  const [mediaProgress, setMediaProgress] = useState({
    source: "",
    position: 0,
    duration: 0,
  });
  const positionRef = useRef(0);
  const navigating = useRef(false);
  const [frameRevision, setFrameRevision] = useState(0);
  const [timelineNow, setTimelineNow] = useState(() => Date.now());
  const room = state.room;
  const isOwner = room?.ownerId === auth.session?.user.id;
  const host =
    !!room &&
    (isOwner || !!room.cohosts?.includes(auth.session?.user.id ?? ""));
  const source = room?.media.url ?? "";
  const mediaError = mediaFailure.source === source ? mediaFailure.message : "";
  const tapRequired = tapSource === source && !!source;
  const progress =
    mediaProgress.source === source
      ? mediaProgress
      : { position: 0, duration: 0 };
  const ready = state.status === "connected";
  const sessionId = auth.session?.user.id;
  const sessionToken = auth.session?.token;
  useFocusEffect(
    useCallback(() => {
      if (!auth.ready || !sessionToken) return;
      let cancelled = false;
      const start = async () => {
        if (retry > 0) setActionError("");
        setBootError("");
        setJoining(true);
        try {
          let target = id;
          let inviteCode = code;
          if (!target && code) {
            const resolved = await accountRequest<Room>(
              "/api/v1/rooms/invite/" + encodeURIComponent(code),
            );
            target = resolved.id;
            inviteCode = resolved.inviteCode ?? code;
          }
          if (!target)
            throw new Error("Pide un enlace o código de invitación válido.");
          if (!cancelled) await enterRoom(target, inviteCode);
        } catch (e) {
          if (!cancelled)
            setBootError(e instanceof Error ? e.message : "No se pudo entrar.");
        } finally {
          if (!cancelled) setJoining(false);
        }
      };
      void start();
      return () => {
        cancelled = true;
        void leaveRoom();
      };
    }, [auth.ready, sessionToken, id, code, retry]),
  );
  useEffect(() => {
    const timer = setInterval(() => setTimelineNow(Date.now()), 10000);
    const unsubscribe = useRoom.subscribe((next, previous) => {
      if (
        next.room !== previous.room ||
        next.clockOffset !== previous.clockOffset
      )
        setTimelineNow(Date.now());
    });
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, []);
  const timeline = useMemo(
    () => ({
      at: timelineNow,
      position: room
        ? playbackPosition(room, timelineNow, state.clockOffset)
        : 0,
    }),
    [room, timelineNow, state.clockOffset],
  );
  const desiredPosition = timeline.position;
  const act = async (method: string, ...args: unknown[]) => {
    setBusy(true);
    setActionError("");
    try {
      await roomCommand(method, ...args);
      return true;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo completar.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const playback = (playing: boolean, position: number) => {
    const latest = useRoom.getState().room;
    if (!latest) return;
    return act("SetPlayback", latest.id, {
      playing,
      positionSeconds: Number.isFinite(position)
        ? Math.max(0, Math.min(86400, position))
        : 0,
      version: latest.version,
    });
  };
  const mediaEvent = (event: MediaEvent) => {
    if (event.kind === "source") {
      const url = event.url && youtubeVideoUrl(event.url);
      const latest = useRoom.getState().room;
      if (!url || !latest || url === latest.media.url || navigating.current) return;
      if (!host || !ready) { setFrameRevision((x) => x + 1); return; }
      navigating.current = true;
      void act("ChangeMedia", latest.id, {
        media: { kind: latest.media.category === "music" ? "audio" : "video", url },
        version: latest.version,
        playing: event.playing ?? true,
        positionSeconds: Math.max(0, Math.min(86400, event.position ?? 0)),
      }).then(async (ok) => {
        if (!ok) {
          await refreshRoom().catch(() => {});
          setFrameRevision((x) => x + 1);
        }
      }).finally(() => { navigating.current = false; });
      return;
    }
    if (event.kind === "ready") {
      positionRef.current = 0;
      setMediaProgress({ source, position: 0, duration: 0 });
    }
    if (event.kind === "error")
      setMediaFailure({
        source,
        message:
          room?.media.kind === "youtube"
            ? "Este video no pudo reproducirse aquí. Puede estar restringido; abre la fuente o elige otro."
            : "No se pudo reproducir este archivo. Prueba otro enlace o formato.",
      });
    if (event.kind === "tap") setTapSource(source);
    if (event.kind === "started") setTapSource("");
    if (event.kind === "progress") {
      positionRef.current = event.position ?? 0;
      setMediaProgress({
        source,
        position: event.position ?? 0,
        duration: Number.isFinite(event.duration) ? event.duration! : 0,
      });
    }
    if (
      event.kind === "control" &&
      host &&
      ready &&
      !busy &&
      AppState.currentState === "active"
    )
      void playback(event.playing ?? false, event.position ?? 0);
    if (event.kind === "ended" && isOwner && room?.queue[0] && ready)
      void act("PlayQueued", room.id, orderedQueue(room.queue)[0].id);
  };
  const send = async () => {
    if (!room || !text.trim()) return;
    if (await act("SendMessage", room.id, text.trim())) setText("");
  };
  const share = () => {
    if (room?.inviteCode)
      void Share.share({
        message: `Ven a ${room.name} en ONDA: https://onda.lunalav.pe/room?code=${room.inviteCode}\nCódigo: ${room.inviteCode}`,
      }).catch(() => {});
  };
  const report = async () => {
    if (!room) return;
    setBusy(true);
    setActionError("");
    try {
      await accountRequest("/api/v1/rooms/" + room.id + "/reports", {
        method: "POST",
        body: { accountId: member?.id ?? null, reason },
      });
      setSheet(null);
      setReason("");
      setMember(null);
      setActionError("Reporte recibido. Gracias por ayudar a cuidar la sala.");
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "No se pudo enviar el reporte.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (!focused) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  if (!auth.ready) return <Loading />;
  if (!auth.session)
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ScreenHeader title="Te están esperando" back />
        <Page>
          <Card>
            <Label style={{ fontWeight: "900", fontSize: 24 }}>
              Un buen momento empieza juntos.
            </Label>
            <Muted>
              Elige un nombre y entra. Puedes guardar una cuenta después.
            </Muted>
            <FormField
              label="Tu nombre"
              value={name}
              onChange={setName}
              placeholder="Cómo te verán en la sala"
              maxLength={40}
            />
            <Button
              title={joining ? "Entrando…" : "Entrar como invitado"}
              disabled={joining}
              onPress={() => {
                setJoining(true);
                setBootError("");
                void ensureListener(name)
                  .catch((e) => setBootError(e.message))
                  .finally(() => setJoining(false));
              }}
            />
            {bootError && (
              <Label accessibilityRole="alert" style={{ color: c.live }}>
                {bootError}
              </Label>
            )}
            <Button
              title="Ya tengo cuenta"
              secondary
              onPress={() => router.push("/account")}
            />
          </Card>
        </Page>
      </View>
    );
  if (!room)
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ScreenHeader title="Entrar a la sala" back />
        <Page>
          {joining || state.status === "connecting" ? (
            <Loading />
          ) : (
            <>
              <EmptyState
                icon="people-outline"
                title="No pudimos entrar todavía"
                body={
                  bootError ||
                  state.error ||
                  "Comprueba la invitación y tu conexión."
                }
              />
              <Button
                title="Volver a intentar"
                onPress={() => setRetry((x) => x + 1)}
              />
            </>
          )}
        </Page>
      </View>
    );
  const radioStatus = state.audioMuted
    ? "Tu audio está silenciado"
    : !room.isPlaying
      ? "En pausa"
      : nativePlayback.station?.id === room.media.station?.id &&
          nativePlayback.state === "playing"
        ? "En vivo"
        : nativePlayback.state === "error"
          ? "No se pudo reproducir"
          : "Conectando…";
  const saved = room.media.station
    ? library.favorites.some((x) => x.id === room.media.station!.id)
    : library.mediaFavorites.some((x) => x.media.url === room.media.url);
  return (
    <RoomLayout
      room={room}
      frameRevision={frameRevision}
      userId={sessionId}
      controller={host}
      connected={ready}
      connection={state.status}
      tab={tab}
      onTab={setTab}
      text={text}
      onText={setText}
      send={() => void send()}
      busy={busy}
      messages={state.messages.filter((x) => !state.muted.includes(x.senderId))}
      votes={state.votes}
      mutedMembers={state.muted}
      audioMuted={state.audioMuted}
      radioStatus={radioStatus}
      position={progress.position}
      duration={progress.duration}
      desiredPosition={desiredPosition}
      positionAt={timeline.at}
      mediaError={mediaError}
      tapRequired={tapRequired}
      reaction={state.reaction}
      error={state.error || actionError}
      onEvent={mediaEvent}
      onPlayback={(playing, position) => void playback(playing, position)}
      toggleAudio={toggleRoomAudio}
      resync={() => void refreshRoom().catch((e) => setActionError(e.message))}
      saved={saved}
      toggleSave={() =>
        room.media.station
          ? library.toggle(room.media.station)
          : library.toggleMedia(room.media)
      }
      onMember={setMember}
      onBrowseYoutube={() => {
        setStartupPicker(false); setDirectSelection(true);
        setInput({kind: "youtube"}); setOpenYoutube(true); setSheet("add");
      }}
      onSheet={(sheet) => {
        if (sheet === "report") setMember(null);
        if (sheet === "add") {
          setStartupPicker(false);
          setDirectSelection(!room.media.url);
          setInput({kind: room.media.kind});
          setOpenYoutube(room.media.kind === "youtube");
        }
        setSheet(sheet);
      }}
      act={act}
    >
      {sheet === "invite" && (
        <Sheet title="Invita a tu gente" onClose={() => setSheet(null)}>
          <Muted>
            {room.isPrivate
              ? "Quien reciba este código podrá entrar a la sala privada."
              : "Comparte el enlace para entrar directamente."}
          </Muted>
          <Label
            selectable
            style={{
              fontSize: 26,
              letterSpacing: 3,
              fontWeight: "900",
              textAlign: "center",
              paddingVertical: 18,
            }}
          >
            {room.inviteCode}
          </Label>
          <Button
            title="Copiar enlace"
            secondary
            icon="copy-outline"
            onPress={() => {
              const code = room.inviteCode;
              if (code)
                void Clipboard.setStringAsync(
                  `https://onda.lunalav.pe/room?code=${code}`,
                )
                  .then((ok) => {
                    if (ok) setCopied(code);
                    else
                      setActionError(
                        "No se pudo copiar. Selecciona el código o usa Compartir.",
                      );
                  })
                  .catch(() =>
                    setActionError(
                      "No se pudo copiar. Selecciona el código o usa Compartir.",
                    ),
                  );
            }}
          />
          {copied === room.inviteCode && (
            <Muted style={{ color: c.primaryText }}>Enlace copiado.</Muted>
          )}
          <Button
            title="Compartir invitación"
            icon="share-social-outline"
            onPress={share}
          />
          {isOwner && (
            <>
              <Muted>
                Renovar el código invalida las invitaciones anteriores. Las
                personas que ya están conectadas permanecen en la sala.
              </Muted>
              <Button
                title="Renovar código de invitación"
                secondary
                disabled={busy}
                onPress={() => void act("RotateInvite", room.id)}
              />
            </>
          )}
        </Sheet>
      )}
      {sheet === "add" && (!startupPicker || !room.media.url) && (
        <Sheet title={room.media.url ? "Qué compartimos después" : "Elige qué mostrar"} onClose={() => setSheet(null)}>
          <SourcePicker value={input} onChange={setInput} openYoutubeInitially={openYoutube} onBrowseClose={() => {if (directSelection) setSheet(null);}} onChoose={(media) => {
            if (!directSelection || !host || !ready) return;
            const latest = useRoom.getState().room;
            if (latest) void act("ChangeMedia", latest.id, {media, version: latest.version}).then((ok) => {if (ok) setSheet(null);});
          }} />
          {actionError && <Muted>{actionError}</Muted>}
          {host && <Button
            title={busy ? "Cambiando…" : "Reproducir para todos"}
            icon="play-outline"
            disabled={busy || !ready || (input.kind === "radio" ? !input.stationId : !input.url?.trim())}
            onPress={() => {
              const latest = useRoom.getState().room;
              if (!latest) return;
              void act("ChangeMedia", latest.id, { media: input, version: latest.version }).then((ok) => {
                if (ok) { setSheet(null); setInput({ kind: "video" }); }
              });
            }}
          />}
          <Button
            title={busy ? "Añadiendo…" : "Añadir a la cola"}
            secondary={host}
            disabled={
              busy || !ready ||
              (input.kind === "radio" && !input.stationId) ||
              (input.kind !== "radio" && !input.url?.trim())
            }
            onPress={() => {
              void act("AddToQueue", room.id, input).then((ok) => {
                if (ok) {
                  setSheet(null);
                  setTab("queue");
                }
              });
            }}
          />
        </Sheet>
      )}
      {member && !sheet && (
        <Sheet title={member.name} onClose={() => setMember(null)}>
          {member.id !== sessionId && (
            <>
              <ActionRow
                icon="volume-mute-outline"
                label={
                  state.muted.includes(member.id)
                    ? "Volver a mostrar sus mensajes"
                    : "Silenciar sus mensajes para mí"
                }
                onPress={() => {
                  muteMember(member.id);
                  setMember(null);
                }}
              />
              <ActionRow
                icon="flag-outline"
                label="Reportar a esta persona"
                onPress={() => {
                  setReason("");
                  setSheet("report");
                }}
              />
              {isOwner && (
                <>
                  <ActionRow
                    icon="people-outline"
                    label={
                      room.cohosts?.includes(member.id)
                        ? "Quitar rol de coanfitrión"
                        : "Hacer coanfitrión"
                    }
                    onPress={() => {
                      void act(
                        "SetCohost",
                        room.id,
                        member.id,
                        !room.cohosts?.includes(member.id),
                      ).then((ok) => {
                        if (ok) setMember(null);
                      });
                    }}
                  />
                  <ActionRow
                    icon="star-outline"
                    label="Pasarle el control de la sala"
                    onPress={() => {
                      void act("TransferHost", room.id, member.id).then(
                        (ok) => {
                          if (ok) setMember(null);
                        },
                      );
                    }}
                  />
                  <ActionRow
                    icon="remove-circle-outline"
                    label="Expulsar de esta sala"
                    onPress={() => {
                      void act("Kick", room.id, member.id).then((ok) => {
                        if (ok) setMember(null);
                      });
                    }}
                  />
                </>
              )}
            </>
          )}
          {room.media.url && (
            <ActionRow
              icon="open-outline"
              label="Abrir fuente del contenido"
              onPress={() => {
                void Linking.openURL(room.media.url!);
                setMember(null);
              }}
            />
          )}
        </Sheet>
      )}
      {sheet === "report" && (
        <Sheet
          title={member ? `Reportar a ${member.name}` : "Reportar sala"}
          onClose={() => {
            setSheet(null);
            setMember(null);
          }}
        >
          <FormField
            label="Qué ocurrió"
            value={reason}
            onChange={setReason}
            maxLength={500}
            multiline
          />
          {actionError && <Muted>{actionError}</Muted>}
          <Button
            title={busy ? "Enviando…" : "Enviar reporte"}
            disabled={busy || reason.trim().length < 3}
            onPress={() => void report()}
          />
        </Sheet>
      )}
      {sheet === "close" && (
        <Sheet title="Cerrar sala" onClose={() => setSheet(null)}>
          <Muted>
            Todos saldrán de esta sala. Si quieres que continúe, pasa el control
            a otra persona antes de salir.
          </Muted>
          <Button
            title="Cerrar para todos"
            onPress={() => {
              void act("CloseRoom", room.id).then((ok) => {
                if (ok) router.replace("/rooms");
              });
            }}
          />
        </Sheet>
      )}
    </RoomLayout>
  );
}
