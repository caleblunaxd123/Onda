import {useTheme} from '../../theme';
import { useState } from "react";
import { FlatList, Keyboard, View } from "react-native";
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
  Message,
  Muted,
  SearchField,
  Sheet,
} from "../../ui";
import { FormField } from "../../components/forms";
import { useAuth } from "../account/session";
import { RoomRow } from "./presentation";
import type { RoomSummary } from "./types";
import {OndaAmbientBackground, OndaCategoryTile, OndaGlassSurface, OndaGradientButton, OndaMotionCard, OndaSkeleton} from '../../components/experience';

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
  const [filter, setFilter] = useState<'all' | 'video' | 'music'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const items = (rooms.data?.items ?? []).filter((room) => fold(room.name + " " + room.media.title).includes(fold(search.trim())) &&
    (filter === 'all' || (filter === 'music' ? ['radio', 'audio'].includes(room.media.kind) : ['video', 'youtube', 'stream'].includes(room.media.kind))));
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
    <View style={{ flex: 1 }}>
      <OndaAmbientBackground/>
      <BrandHeader calm>
        <IconButton icon="search-outline" label="Explorar salas, videos, música y radio" onPress={() => router.push('/explore')}/>
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, gap: 10, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        onRefresh={() => void rooms.refetch()}
        refreshing={rooms.isRefetching}
        ListHeaderComponent={
          <View style={{ gap: 14, paddingBottom: 6 }}>
            <View style={{gap: 6}}><Label accessibilityRole="header" style={{fontSize: 25, lineHeight: 31, fontWeight: "800", letterSpacing: -.5}}>Mira y escucha con amigos.</Label>
            <Muted style={{fontSize: 14, lineHeight: 20}}>Descubre salas, comparte contenido y vive la experiencia juntos.</Muted></View>
            <SearchField value={search} onChange={setSearch} placeholder="Buscar sala, video o canción" label="Buscar sala o contenido" />
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Chip label="Descubrir" icon="earth-outline" selected={!mine} onPress={() => setMine(false)} />
              <Chip label="Mis salas" icon="person-outline" selected={mine} onPress={() => setMine(true)} />
              <View style={{ flex: 1 }} />
              <IconButton icon="options-outline" label="Filtrar salas por música o video" onPress={() => setFiltersOpen(true)}/>
            </View>
            {filter !== 'all' && <View style={{alignItems: 'flex-start'}}><Chip label={filter === 'music' ? 'Música' : 'Videos'} selected onRemove={() => setFilter('all')}/></View>}
            <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}><Label accessibilityRole="header" style={{fontSize: 20, lineHeight: 26, fontWeight: "800", flex: 1}}>{mine ? "Tus salas" : "Salas públicas"}</Label><Muted style={{fontSize: 12}}>{items.length} {items.length === 1 ? 'sala' : 'salas'}</Muted></View>
          </View>
        }
        ListEmptyComponent={
          rooms.isPending ? (
            <OndaSkeleton />
          ) : rooms.isError ? (
            <Message title="No se pudieron cargar las salas" body={rooms.error.message} retry={() => rooms.refetch()} />
          ) : (
            <View style={{ gap: 14 }}>
              <EmptyState
                icon="people-outline"
                title={search ? "Otro nombre puede abrir otra puerta" : mine ? "Tu primera sala empieza con un play" : "Todavía no hay salas públicas"}
                body={search ? "Prueba otra búsqueda." : "Crea una sala, elige qué ver e invita a tu gente."}
              />
            </View>
          )
        }
        renderItem={({ item, index }) => <OndaMotionCard index={index}><RoomRow room={item} ownerName={item.ownerId === auth.session?.user.id ? auth.session.user.displayName : undefined} onPress={() => {Keyboard.dismiss(); router.push({ pathname: "/room", params: { id: item.id } });}} /></OndaMotionCard>}
        ListFooterComponent={!rooms.isPending && !rooms.isError && !search && (rooms.data?.items.length ?? 0) < 4 ? <View style={{gap: 14, paddingTop: 6}}>
          <OndaGlassSurface><View style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}><Ionicons name="sparkles-outline" size={26} color={c.accent}/><View style={{flex: 1, gap: 4}}><Label style={{fontSize: 17, fontWeight: '800'}}>El siguiente momento lo creas tú</Label><Muted>Elige una fuente, entra e invita a tus amigos.</Muted></View></View></OndaGlassSurface>
          <View style={{flexDirection: 'row', gap: 10}}><OndaCategoryTile title="Videos" note="YouTube y enlaces" icon="play-circle-outline" color="#4895FF" onPress={() => router.push({pathname: '/create-room', params: {source: 'youtube'}})}/><OndaCategoryTile title="Música" note="Escuchar juntos" icon="musical-notes-outline" color="#F063D5" onPress={() => router.push({pathname: '/create-room', params: {source: 'audio'}})}/></View>
          <View style={{flexDirection: 'row', gap: 10}}><OndaCategoryTile title="Radio" note="Explora el catálogo" icon="radio-outline" color="#11DDF4" onPress={() => router.push('/radio')}/><OndaCategoryTile title="Invitación" note="Entrar con código" icon="ticket-outline" color="#B195FF" onPress={() => setInvite(true)}/></View>
        </View> : null}
      />
      <View style={{paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, alignItems: 'flex-end'}}><OndaGradientButton title="Crear sala" icon="add" onPress={() => {Keyboard.dismiss(); router.push('/create-room');}}/></View>
      {filtersOpen && <Sheet title="¿Qué quieres compartir?" onClose={() => setFiltersOpen(false)}><View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>{([{id: 'all', name: 'Todas las salas'}, {id: 'music', name: 'Música y radio'}, {id: 'video', name: 'Videos'}] as const).map(x => <Chip key={x.id} label={x.name} selected={filter === x.id} onPress={() => {setFilter(x.id); setFiltersOpen(false);}}/>)}</View></Sheet>}
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
