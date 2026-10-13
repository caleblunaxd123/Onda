import {gradientStyle, useTheme} from '../../theme';
import { useState } from "react";
import { FlatList, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { request } from "../../api";
import { fold } from "../../format";
import { Ionicons } from "../../icons";
import {
  BrandHeader,
  Button,
  Chip,
  EmptyState,
  IconButton,
  Label,
  Loading,
  Message,
  Muted,
  SearchField,
  Sheet,
} from "../../ui";
import { FormField } from "../../components/forms";
import { useAuth } from "../account/session";
import { RoomTile } from "./presentation";
import type { RoomSummary } from "./types";

export default function RoomsScreen() {
  const c = useTheme();
  const auth = useAuth();
  const [mine, setMine] = useState(false);
  const [invite, setInvite] = useState(false);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState("all");
  const [search, setSearch] = useState("");
  const [inviteError, setInviteError] = useState("");
  const rooms = useQuery({
    queryKey: ["rooms", mine, auth.session?.user.id],
    queryFn: ({ signal }) =>
      request<{ items: RoomSummary[] }>("/api/v1/rooms/?mine=" + mine, {
        signal,
        token: auth.session?.token,
      }),
    refetchInterval: 15000,
    retry: 1,
  });
  const items = (rooms.data?.items ?? []).filter(
    (room) =>
      (kind === "all" ||
        room.media.kind === kind ||
        (kind === "audio" && room.media.category === "music") ||
        (kind === "video" &&
          room.media.kind === "youtube" &&
          room.media.category !== "music")) &&
      fold(room.name + " " + room.media.title).includes(fold(search.trim())),
  );
  const join = () => {
    const match = code.match(
      /(?:[?&]code=|join\/)([a-f0-9]{12})(?:[^a-f0-9]|$)/i,
    );
    const clean = match?.[1] ?? code.trim();
    if (!/^[a-f0-9]{12}$/i.test(clean)) {
      setInviteError("Usa el código de 12 caracteres o el enlace completo.");
      return;
    }
    setInvite(false);
    setCode("");
    setInviteError("");
    router.push({ pathname: "/room", params: { code: clean } });
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BrandHeader
        title="Juntos"
        subtitle="Buenos momentos, en buena compañía."
      >
        <IconButton
          icon="link-outline"
          label="Entrar con invitación"
          onPress={() => setInvite(true)}
        />
        <IconButton
          icon="person-outline"
          label="Tu cuenta"
          onPress={() => router.push("/account")}
        />
      </BrandHeader>
      <FlatList
        data={items}
        numColumns={2}
        keyExtractor={(room) => room.id}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 32 }}
        onRefresh={() => void rooms.refetch()}
        refreshing={rooms.isRefetching}
        ListHeaderComponent={
          <View style={{ gap: 18, paddingBottom: 18 }}>
            <View
              style={{
                borderRadius: 26,
                padding: 22,
                gap: 16,
                ...gradientStyle("linear-gradient(130deg, #172443 0%, #24153E 68%, #121827 100%)", "#14294B"),
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  position: "absolute",
                  right: -36,
                  top: -30,
                  width: 180,
                  height: 180,
                  borderRadius: 90,
                  borderWidth: 1,
                  borderColor: "#7663B34D",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  right: -10,
                  top: -4,
                  width: 128,
                  height: 128,
                  borderRadius: 64,
                  borderWidth: 1,
                  borderColor: "#5AC9EC40",
                }}
              />
              <Label
                style={{
                  fontSize: 10,
                  fontWeight: "900",
                  letterSpacing: 2.5,
                  color: "#73E1F2",
                }}
              >
            ONDA / VER JUNTOS
              </Label>
              <Label
                style={{
                  fontWeight: "900",
                  fontSize: 31,
                  lineHeight: 36,
                  color: "#FFFFFF",
                  maxWidth: "85%",
                }}
              >
                Dale play.{"\n"}Comparte el momento.
              </Label>
              <Muted style={{ color: "#C1C7DA", maxWidth: "90%" }}>
                Una radio, una canción o un video. Tu gente está a una
                invitación de distancia.
              </Muted>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
              >
                <View style={{ flex: 1 }}>
                  <Button
                    title="Crear sala"
                    icon="add"
                    onPress={() => router.push("/create-room")}
                  />
                </View>
                <IconButton
                  icon="link-outline"
                  label="Tengo una invitación"
                  onPress={() => setInvite(true)}
                />
              </View>
              <View
                style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={12}
                  color="#AEBAD4"
                />
                <Label style={{ fontSize: 11, color: "#AEBAD4" }}>
                  Privada por defecto · Cuenta opcional
                </Label>
              </View>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Chip
                  label="Descubrir"
                  selected={!mine}
                  onPress={() => setMine(false)}
                />
                <Chip
                  label="Mis salas"
                  selected={mine}
                  onPress={() => setMine(true)}
                />
              </View>
              <Muted style={{ fontSize: 12 }}>{items.length} salas</Muted>
            </View>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Una sala, una canción, un momento…"
              label="Buscar sala o contenido"
            />
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {[
                { id: "all", name: "Todo", icon: "sparkles-outline" },
                { id: "radio", name: "Radio", icon: "radio-outline" },
                { id: "audio", name: "Música", icon: "musical-notes-outline" },
                { id: "video", name: "Video", icon: "videocam-outline" },
              ].map((item) => (
                <Chip
                  key={item.id}
                  label={item.name}
                  icon={item.icon as "radio-outline"}
                  selected={kind === item.id}
                  onPress={() => setKind(item.id)}
                />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          rooms.isPending ? (
            <Loading />
          ) : rooms.isError ? (
            <Message
              title="No se pudieron cargar las salas"
              body={rooms.error.message}
              retry={() => rooms.refetch()}
            />
          ) : (
            <EmptyState
              icon="people-outline"
              title={
                search
                  ? "Otro nombre puede abrir otra puerta"
                  : mine
                    ? "Tu primera sala empieza con un play"
                    : "El próximo buen momento puede ser tuyo"
              }
              body={
                search
                  ? "Prueba otra búsqueda o cambia el tipo de contenido."
                  : mine
                    ? "Crea una sala; vuelve cuando quieras desde aquí."
                    : "Crea una sala privada e invita a alguien. Las públicas aparecerán aquí."
              }
            />
          )
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: "50%" }}>
            <RoomTile
              room={item}
              onPress={() =>
                router.push({ pathname: "/room", params: { id: item.id } })
              }
            />
          </View>
        )}
      />
      {invite && (
        <Sheet
          title="Tu gente te está esperando"
          onClose={() => setInvite(false)}
        >
          <Muted>Pega el enlace o escribe el código de la sala.</Muted>
          <FormField
            label="Enlace o código"
            value={code}
            onChange={(value) => {
              setCode(value);
              setInviteError("");
            }}
            maxLength={300}
          />
          {inviteError && (
            <Label accessibilityRole="alert" style={{ color: c.live }}>
              {inviteError}
            </Label>
          )}
          <Button
            title="Entrar a la sala"
            disabled={!code.trim()}
            icon="arrow-forward"
            onPress={join}
          />
        </Sheet>
      )}
    </View>
  );
}
