import {useTheme} from '../../theme';
import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
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
import { RoomRow } from "./presentation";
import type { RoomSummary } from "./types";

export default function RoomsScreen() {
  const c = useTheme();
  const auth = useAuth();
  const params = useLocalSearchParams<{view?: string}>();
  const mine = params.view === "mine";
  const setMine = (value: boolean) => router.setParams({view: value ? "mine" : "discover"});
  const [invite, setInvite] = useState(false);
  const [code, setCode] = useState("");
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
  const items = (rooms.data?.items ?? []).filter((room) => fold(room.name + " " + room.media.title).includes(fold(search.trim())));
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
      <BrandHeader calm>
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
        keyExtractor={(room) => room.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, gap: 10, paddingBottom: 110 }}
        onRefresh={() => void rooms.refetch()}
        refreshing={rooms.isRefetching}
        ListHeaderComponent={
          <View style={{ gap: 12, paddingBottom: 6 }}>
            <Label accessibilityRole="header" style={{fontSize: 22, lineHeight: 28, fontWeight: "800"}}>Mira y escucha con amigos.</Label>
            <SearchField value={search} onChange={setSearch} placeholder="Buscar sala, video o canción" label="Buscar sala o contenido" />
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Chip label="Descubrir" icon="earth-outline" selected={!mine} onPress={() => setMine(false)} />
              <Chip label="Mis salas" icon="person-outline" selected={mine} onPress={() => setMine(true)} />
              <View style={{ flex: 1 }} />
              <Muted style={{ fontSize: 12 }}>{items.length} {items.length === 1 ? "sala" : "salas"}</Muted>
            </View>
            <Label accessibilityRole="header" style={{fontSize: 15, fontWeight: "700"}}>{mine ? "Tus salas" : "Salas públicas"}</Label>
          </View>
        }
        ListEmptyComponent={
          rooms.isPending ? (
            <Loading />
          ) : rooms.isError ? (
            <Message title="No se pudieron cargar las salas" body={rooms.error.message} retry={() => rooms.refetch()} />
          ) : (
            <View style={{ gap: 14 }}>
              <EmptyState
                icon="people-outline"
                title={search ? "Otro nombre puede abrir otra puerta" : mine ? "Tu primera sala empieza con un play" : "Todavía no hay salas públicas"}
                body={search ? "Prueba otra búsqueda." : "Crea una sala, elige qué ver e invita a tu gente."}
              />
              {!search && <Button title="Crear sala" icon="add" onPress={() => router.push("/create-room")} />}
            </View>
          )
        }
        renderItem={({ item }) => <RoomRow room={item} onPress={() => router.push({ pathname: "/room", params: { id: item.id } })} />}
      />
      {/* Rave-style floating create button. */}
      <Pressable accessibilityRole="button" accessibilityLabel="Crear sala" onPress={() => router.push("/create-room")}
        style={({ pressed }) => ({ position: "absolute", right: 20, bottom: 24, paddingHorizontal: 18, height: 56, borderRadius: 28, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center",
          backgroundColor: c.primary, opacity: pressed ? 0.85 : 1, boxShadow: c.shadow })}>
        <Ionicons name="add" size={26} color={c.onPrimary} />
        <Label style={{fontWeight: "800", color: c.onPrimary}}>Crear sala</Label>
      </Pressable>
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
