import { useRef, useState } from "react";
import { Keyboard, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "../src/theme";
import { useLibrary } from "../src/library";
import { Ionicons } from "../src/icons";
import { Button, Card, Chip, Label, Muted, Page, ScreenHeader, Sheet } from "../src/ui";
import { FormField } from "../src/components/forms";
import { accountRequest, ensureListener, useAuth } from "../src/features/account/session";
import type { MediaInput, MediaKind, Room } from "../src/features/rooms/types";

const providers = [
  { kind: "youtube", name: "YouTube", icon: "logo-youtube", color: "#FF5268", detail: "Busca videos dentro de tu sala" },
  { kind: "radio", name: "Radio", icon: "radio-outline", color: "#47D9EA", detail: "Elige una emisora con tu gente" },
  { kind: "audio", name: "Música", icon: "musical-notes-outline", color: "#B7A0FF", detail: "Comparte música por enlace" },
  { kind: "stream", name: "Netflix, Prime y más", icon: "tv-outline", color: "#FF7A85", detail: "Cada persona con su cuenta; ONDA sincroniza el tiempo y el chat" },
  { kind: "video", name: "Video por enlace", icon: "link-outline", color: "#FBC786", detail: "Comparte un archivo de video HTTPS" },
] as const;

export default function CreateRoomScreen() {
  const c = useTheme();
  const user = useAuth((s) => s.session?.user);
  const params = useLocalSearchParams<{stationId?: string; bookmark?: string}>();
  const saved = useLibrary((s) => s.mediaFavorites.find((x) => x.id === params.bookmark));
  const selected: MediaInput | null = saved
    ? {kind: saved.media.category === "music" ? "audio" : saved.media.kind, url: saved.media.url ?? undefined, title: saved.media.title}
    : params.stationId ? {kind: "radio", stationId: params.stationId} : null;
  const creating = useRef(false);
  const [busy, setBusy] = useState<MediaKind | null>(null);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [privateRoom, setPrivateRoom] = useState(true);
  const [autoRecovery, setAutoRecovery] = useState(true);
  const [options, setOptions] = useState(false);
  const [error, setError] = useState("");
  const create = async (kind: MediaKind, media?: MediaInput) => {
    if (creating.current) return;
    if (name.trim().length === 1) {setError("Usa un nombre de al menos dos caracteres o déjalo vacío."); return;}
    creating.current = true; setBusy(kind); setError(""); Keyboard.dismiss();
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
    <ScreenHeader title="Crear sala" subtitle="Elige una fuente. Entrarás directamente a tu sala." back />
    <Page>
      {selected && <Card>
        <Label style={{fontWeight: "800"}}>{saved?.media.title ?? "Tu emisora seleccionada"}</Label>
        <Button title={busy ? "Entrando…" : "Crear sala con este contenido"} disabled={!!busy} icon="play-outline" onPress={() => void create(selected.kind, selected)} />
      </Card>}
      <View style={{gap: 12}}>
        {providers.map((provider) => <Pressable key={provider.kind} accessibilityRole="button" accessibilityLabel={"Crear sala de " + provider.name}
          accessibilityState={{disabled: !!busy}} disabled={!!busy} onPress={() => void create(provider.kind)}
          style={({pressed}) => ({flexDirection: "row", alignItems: "center", gap: 16, minHeight: 94, padding: 18, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, opacity: busy || pressed ? .65 : 1})}>
          <View style={{width: 50, height: 50, borderRadius: 15, backgroundColor: provider.color + "18", alignItems: "center", justifyContent: "center"}}><Ionicons name={provider.icon} size={28} color={provider.color} /></View>
          <View style={{flex: 1, gap: 4}}><Label style={{fontSize: 18, fontWeight: "800"}}>{busy === provider.kind ? "Entrando a tu sala…" : provider.name}</Label><Muted style={{fontSize: 12}}>{provider.detail}</Muted></View>
          <Ionicons name="chevron-forward" size={19} color={c.muted} />
        </Pressable>)}
      </View>
      {error && <Label accessibilityRole="alert" style={{color: c.live}}>{error}</Label>}
      <Muted style={{fontSize: 12}}>{privateRoom ? "Sala privada" : "Sala pública"} · Tus amigos pueden entrar por enlace sin cuenta.</Muted>
      <Muted style={{fontSize: 11}}>{autoRecovery ? "Si te desconectas durante 60 segundos, el control pasa a una persona conectada." : "El control permanece contigo si te desconectas."}</Muted>
      <Button title="Opciones de sala" secondary icon="options-outline" disabled={!!busy} onPress={() => setOptions(true)} />
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
