import { useRef, useState } from "react";
import { Keyboard, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "../src/theme";
import { useLibrary } from "../src/library";
import { Ionicons } from "../src/icons";
import { Button, Card, Chip, Label, Muted, Page, ScreenHeader, Sheet } from "../src/ui";
import { FormField } from "../src/components/forms";
import { accountRequest, ensureListener, useAuth } from "../src/features/account/session";
import { type MediaInput, type MediaKind, type Room } from "../src/features/rooms/types";

type Provider = {id: string; kind: MediaKind; name: string; icon: "logo-youtube" | "radio-outline" | "musical-notes-outline" | "link-outline" | "tv-outline"; color: string; note?: string};
/** Rave-style grid: tap a source and you are in your room. Subscription services say clearly how they work. */
const providers: Provider[] = [
  {id: "youtube", kind: "youtube", name: "YouTube", icon: "logo-youtube", color: "#FF5268"},
  {id: "radio", kind: "radio", name: "Radio", icon: "radio-outline", color: "#47D9EA"},
  {id: "audio", kind: "audio", name: "Música", icon: "musical-notes-outline", color: "#B7A0FF", note: "Por enlace"},
  {id: "video", kind: "video", name: "Video", icon: "link-outline", color: "#FBC786", note: "MP4/WebM por enlace"},
];

export default function CreateRoomScreen() {
  const c = useTheme();
  const user = useAuth((s) => s.session?.user);
  const params = useLocalSearchParams<{stationId?: string; bookmark?: string}>();
  const saved = useLibrary((s) => s.mediaFavorites.find((x) => x.id === params.bookmark));
  const selected: MediaInput | null = saved
    ? {kind: saved.media.category === "music" ? "audio" : saved.media.kind, url: saved.media.url ?? undefined, title: saved.media.title}
    : params.stationId ? {kind: "radio", stationId: params.stationId} : null;
  const creating = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [privateRoom, setPrivateRoom] = useState(true);
  const [autoRecovery, setAutoRecovery] = useState(true);
  const [options, setOptions] = useState(false);
  const [error, setError] = useState("");
  const create = async (kind: MediaKind, media?: MediaInput, id: string = kind) => {
    if (creating.current) return;
    if (name.trim().length === 1) {setError("Usa un nombre de al menos dos caracteres o déjalo vacío."); return;}
    creating.current = true; setBusy(id); setError(""); Keyboard.dismiss();
    try {
      const listener = await ensureListener(displayName);
      const room = await accountRequest<Room>("/api/v1/rooms/", {method: "POST", body: {
        name: name.trim() || `Sala de ${listener.user.displayName}`.slice(0, 70),
        isPrivate: privateRoom, autoRecovery, media: media ?? {kind}, provider: media ? undefined : kind,
      }});
      router.replace({pathname: "/room", params: {id: room.id, code: room.inviteCode ?? "", ...(media ? {} : {choose: kind})}});
    } catch (e) {setError(e instanceof Error ? e.message : "No se pudo crear la sala.");}
    finally {creating.current = false; setBusy(null);}
  };
  return <View style={{flex: 1, backgroundColor: c.bg}}>
    <ScreenHeader title="¿Qué compartimos?" subtitle="Elige una fuente y entra a tu sala." back />
    <Page>
      {selected && <Card>
        <Label style={{fontWeight: "800"}}>{saved?.media.title ?? "Tu emisora seleccionada"}</Label>
        <Button title={busy ? "Entrando…" : "Crear sala con este contenido"} disabled={!!busy} icon="play-outline" onPress={() => void create(selected.kind, selected)} />
      </Card>}
      <View style={{flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12}}>
        {providers.map((provider) => <Pressable key={provider.id} accessibilityRole="button"
          accessibilityLabel={`Crear sala de ${provider.name}${provider.note ? ", " + provider.note.toLowerCase() : ""}`}
          accessibilityState={{disabled: !!busy}} disabled={!!busy} onPress={() => void create(provider.kind, undefined, provider.id)}
          style={({pressed}) => ({width: "48%", minHeight: 132, padding: 16, borderRadius: 20, gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: c.surface,
            borderWidth: 1, borderColor: busy === provider.id ? c.primary : c.border, opacity: busy && busy !== provider.id ? .5 : pressed ? .7 : 1})}>
          <Ionicons name={provider.icon} size={34} color={provider.color} />
          <Label numberOfLines={1} style={{fontSize: 18, fontWeight: "900"}}>{provider.name}</Label>
          <Muted numberOfLines={1} style={{fontSize: 11}}>{busy === provider.id ? "Entrando…" : provider.note ?? "Busca dentro de tu sala"}</Muted>
        </Pressable>)}
      </View>
      {error && <View style={{gap: 8}}>
        <Label accessibilityRole="alert" style={{color: c.live}}>{error}</Label>
        <Button title="Ver mis salas abiertas" secondary icon="people-outline" onPress={() => router.replace({pathname: "/rooms", params: {view: "mine"}})}/>
      </View>}
      <Pressable accessibilityRole="button" accessibilityLabel="Crear sala con otro servicio, sincronización manual" disabled={!!busy}
        onPress={() => void create("stream")} style={({pressed}) => ({padding: 16, borderRadius: 18, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", gap: 12, opacity: busy || pressed ? .6 : 1})}>
        <Ionicons name="tv-outline" size={26} color={c.muted}/>
        <View style={{flex: 1, gap: 4}}><Label style={{fontWeight: "800"}}>Otros servicios</Label>
          <Muted style={{fontSize: 12}}>Netflix, Prime, Disney+ y más · con tu cuenta</Muted>
          <Muted style={{fontSize: 11}}>Se abren fuera de ONDA. Sincronización manual.</Muted>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.muted}/>
      </Pressable>
      <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
        <Ionicons name={privateRoom ? "lock-closed-outline" : "earth-outline"} size={17} color={c.primaryText}/>
        <Muted style={{flex: 1, fontSize: 12}}>{privateRoom ? "Solo con invitación" : "Pública"} · Entran por enlace, sin cuenta.</Muted>
        <Chip label="Opciones" icon="options-outline" onPress={() => setOptions(true)}/>
      </View>
    </Page>
    {options && <Sheet title="Opciones de sala" onClose={() => setOptions(false)}>
      {!user && <FormField label="Tu nombre (opcional)" value={displayName} onChange={setDisplayName} maxLength={40} placeholder="Cómo te verán tus amigos" />}
      <FormField label="Nombre de la sala (opcional)" value={name} onChange={setName} maxLength={70} placeholder="Le ponemos un nombre por ti" />
      <View style={{flexDirection: "row", gap: 8}}><Chip label="Solo con invitación" selected={privateRoom} onPress={() => setPrivateRoom(true)} /><Chip label="Pública" selected={!privateRoom} onPress={() => setPrivateRoom(false)} /></View>
      <Chip label="Que el momento continúe" icon="sync-outline" selected={autoRecovery} onPress={() => setAutoRecovery((x) => !x)} />
      <Muted>Tras 60 segundos desconectado, el control pasa primero a un coanfitrión o a la primera persona conectada.</Muted>
      <Button title="Listo" onPress={() => setOptions(false)} />
    </Sheet>}
  </View>;
}
