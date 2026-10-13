import { useState } from "react";
import { Keyboard, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "../src/theme";
import { player } from "../src/player";
import { useLibrary } from "../src/library";
import {
  Button,
  Card,
  Chip,
  Label,
  Muted,
  Page,
  ScreenHeader,
} from "../src/ui";
import { FormField } from "../src/components/forms";
import {
  accountRequest,
  ensureListener,
  useAuth,
} from "../src/features/account/session";
import { SourcePicker } from "../src/features/rooms/source-picker";
import type { MediaInput, Room } from "../src/features/rooms/types";
export default function CreateRoomScreen() {
  const c = useTheme();
  const user = useAuth((s) => s.session?.user);
  const params = useLocalSearchParams<{
    stationId?: string;
    bookmark?: string;
  }>();
  const saved = useLibrary((s) =>
    s.mediaFavorites.find((x) => x.id === params.bookmark),
  );
  const current = player.getSnapshot().station;
  const initial =
    params.stationId && current?.id !== params.stationId ? null : current;
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [privateRoom, setPrivateRoom] = useState(true);
  const [media, setMedia] = useState<MediaInput>(
    saved
      ? {
          kind: saved.media.category === "music" ? "audio" : saved.media.kind,
          url: saved.media.url ?? undefined,
          title: saved.media.title,
        }
      : { kind: "radio", stationId: params.stationId ?? initial?.id },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [autoRecovery, setAutoRecovery] = useState(true);
  const create = async () => {
    setBusy(true);
    setError("");
    Keyboard.dismiss();
    try {
      const listener = await ensureListener(displayName);
      const room = await accountRequest<Room>("/api/v1/rooms/", {
        method: "POST",
        body: {
          name:
            name.trim() || `Sala de ${listener.user.displayName}`.slice(0, 70),
          isPrivate: privateRoom,
          autoRecovery,
          media,
        },
      });
      router.replace({
        pathname: "/room",
        params: { id: room.id, code: room.inviteCode ?? "" },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la sala.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader
        title="Tu próximo momento"
        subtitle="Elige algo. Invita a tu gente. Dale play."
        back
      />
      <Page>
        <Label style={{ fontWeight: "800", fontSize: 20, lineHeight: 26 }}>
          Qué quieres compartir
        </Label>
        <SourcePicker
          value={media}
          onChange={setMedia}
          initialStation={initial}
        />
        {!user && (
          <FormField
            label="Tu nombre (opcional)"
            value={displayName}
            onChange={setDisplayName}
            placeholder="Cómo te verán tus amigos"
            maxLength={40}
          />
        )}
        <FormField
          label="Nombre de la sala (opcional)"
          value={name}
          onChange={setName}
          placeholder="Le ponemos un nombre por ti"
          maxLength={70}
        />
        <Card>
          <Label style={{ fontWeight: "800" }}>Quién puede entrar</Label>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip
              label="Solo con invitación"
              icon="lock-closed-outline"
              selected={privateRoom}
              onPress={() => setPrivateRoom(true)}
            />
            <Chip
              label="Pública"
              icon="earth-outline"
              selected={!privateRoom}
              onPress={() => setPrivateRoom(false)}
            />
          </View>
          <Muted>
            {privateRoom
              ? "Comparte el enlace o código con quienes quieras invitar."
              : "Aparecerá en Explorar para que otras personas puedan unirse."}
          </Muted>
        </Card>
        <Card>
          <Chip
            label="Que el momento continúe"
            icon="sync-outline"
            selected={autoRecovery}
            onPress={() => setAutoRecovery((x) => !x)}
          />
          <Muted>
            {autoRecovery
              ? "Si te desconectas durante 60 segundos, el control pasa a un coanfitrión o a la primera persona conectada. Puedes desactivar esta opción."
              : "El control permanece contigo aunque te desconectes. Puedes nombrar coanfitriones dentro de la sala."}
          </Muted>
        </Card>
      </Page>
      <SafeAreaView
        edges={["bottom"]}
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          borderTopWidth: 1,
          borderColor: c.border,
          backgroundColor: c.bg,
          gap: 10,
        }}
      >
        {error && (
          <Label
            accessibilityRole="alert"
            style={{ color: c.live, fontSize: 12 }}
          >
            {error}
          </Label>
        )}
        <Button
          title={busy ? "Preparando tu sala…" : "Crear y entrar"}
          icon="people-outline"
          disabled={
            busy ||
            name.trim().length === 1 ||
            (media.kind === "radio" && !media.stationId) ||
            (media.kind !== "radio" && !media.url?.trim())
          }
          onPress={() => void create()}
        />
        <Muted style={{ textAlign: "center", fontSize: 10, paddingBottom: 10 }}>
          Invita por enlace. Tus amigos pueden entrar sin cuenta.
        </Muted>
      </SafeAreaView>
    </View>
  );
}
