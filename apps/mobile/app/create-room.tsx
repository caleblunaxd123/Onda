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
import {OndaAmbientBackground, OndaCategoryTile, OndaGlassSurface, OndaGradientButton} from '../src/components/experience';

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
  const params = useLocalSearchParams<{stationId?: string; bookmark?: string; source?: string}>();
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
  const [source, setSource] = useState<MediaKind>(['youtube', 'radio', 'audio', 'video', 'stream'].includes(params.source ?? '') ? params.source as MediaKind : 'youtube');
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
  return <View style={{flex: 1}}>
    <OndaAmbientBackground/>
    <ScreenHeader title="Crear sala" subtitle="Un momento juntos, en tres decisiones." back />
    <Page>
      <View style={{gap: 5}}><Label style={{fontSize: 25, lineHeight: 31, fontWeight: '800'}}>¿Qué vamos a disfrutar hoy?</Label><Muted>Elige la fuente. Buscarás el contenido dentro de la sala.</Muted></View>
      {selected && <Card>
        <Label style={{fontWeight: "800"}}>{saved?.media.title ?? "Tu emisora seleccionada"}</Label>
        <Muted>Compartirás este contenido, sin volver a elegirlo.</Muted>
      </Card>}
      {!selected && <View style={{gap: 12}}>{[0, 2].map(start => <View key={start} style={{flexDirection: 'row', gap: 12}}>{providers.slice(start, start + 2).map(provider => <View key={provider.id} style={{flex: 1, gap: 4}}><OndaCategoryTile title={provider.name} note={provider.note ?? 'Busca en la sala'} icon={provider.icon} color={provider.color} disabled={!!busy} selected={source === provider.kind} onPress={() => {setSource(provider.kind); setError('');}}/><View style={{flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 8}}><Ionicons name={source === provider.kind ? 'radio-button-on' : 'radio-button-off'} size={16} color={source === provider.kind ? c.primaryText : c.muted}/><Muted style={{fontSize: 11}}>{source === provider.kind ? 'Seleccionado' : provider.name}</Muted></View></View>)}</View>)}</View>}
      {error && <View style={{gap: 8}}>
        <Label accessibilityRole="alert" style={{color: c.live}}>{error}</Label>
        <Button title="Ver mis salas abiertas" secondary icon="people-outline" onPress={() => router.replace({pathname: "/rooms", params: {view: "mine"}})}/>
      </View>}
      {!selected && <Pressable accessibilityRole="button" accessibilityLabel="Elegir otro servicio, sincronización manual" accessibilityState={{selected: source === 'stream'}} disabled={!!busy}
        onPress={() => setSource('stream')} style={({pressed}) => ({padding: 16, borderRadius: 20, borderWidth: 1, borderColor: source === 'stream' ? c.primaryText : c.border, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", gap: 12, opacity: busy || pressed ? .6 : 1})}>
        <Ionicons name="tv-outline" size={26} color={c.muted}/>
        <View style={{flex: 1, gap: 4}}><Label style={{fontWeight: "800"}}>Otros servicios</Label>
          <Muted style={{fontSize: 12}}>Netflix, Prime, Disney+ y más · con tu cuenta</Muted>
          <Muted style={{fontSize: 11}}>Se abren fuera de ONDA. Sincronización manual.</Muted>
        </View>
        <Ionicons name={source === 'stream' ? 'checkmark-circle' : 'chevron-forward'} size={18} color={c.primaryText}/>
      </Pressable>}
      <OndaGlassSurface><Label style={{fontWeight: '800', fontSize: 16}}>¿Quién puede unirse?</Label><View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}><Chip label="Solo invitados" icon="lock-closed-outline" selected={privateRoom} onPress={() => setPrivateRoom(true)}/><Chip label="Pública" icon="earth-outline" selected={!privateRoom} onPress={() => setPrivateRoom(false)}/></View><Muted>{privateRoom ? 'Entran con tu enlace o código.' : 'Aparecerá en Descubrir para que otros puedan entrar.'}</Muted></OndaGlassSurface>
      <OndaGradientButton title={busy ? 'Creando y entrando…' : 'Crear y entrar'} icon="add" disabled={!!busy} onPress={() => void create(selected?.kind ?? source, selected ?? undefined)}/>
      <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
        <Muted style={{flex: 1, fontSize: 12}}>Nombre y preferencias son opcionales.</Muted>
        <Chip label="Opciones" icon="options-outline" onPress={() => setOptions(true)}/>
      </View>
    </Page>
    {options && <Sheet title="Opciones de sala" onClose={() => setOptions(false)}>
      {!user && <FormField label="Tu nombre (opcional)" value={displayName} onChange={setDisplayName} maxLength={40} placeholder="Cómo te verán tus amigos" />}
      <FormField label="Nombre de la sala (opcional)" value={name} onChange={setName} maxLength={70} placeholder="Le ponemos un nombre por ti" />
      <Chip label="Que el momento continúe" icon="sync-outline" selected={autoRecovery} onPress={() => setAutoRecovery((x) => !x)} />
      <Muted>Tras 60 segundos desconectado, el control pasa primero a un coanfitrión o a la primera persona conectada.</Muted>
      <Button title="Listo" onPress={() => setOptions(false)} />
    </Sheet>}
  </View>;
}
