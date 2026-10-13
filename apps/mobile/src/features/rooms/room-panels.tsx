import { useRef, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "../../theme";
import { Ionicons } from "../../icons";
import { Button, Chip, IconButton, Label, Muted } from "../../ui";
import { Avatar, MediaPoster } from "./presentation";
import { orderedQueue, type ChatMessage } from "./types";
import type { RoomLayoutProps } from "./room-layout";

export function RoomChat(p: RoomLayoutProps) {
  const c = useTheme();
  const list = useRef<FlatList<ChatMessage>>(null);
  const follow = useRef(true);
  const [away, setAway] = useState(false);
  return (
    <>
      <FlatList
        ref={list}
        data={p.messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 14, gap: 12, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (follow.current) list.current?.scrollToEnd({ animated: true });
        }}
        onScroll={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } =
            e.nativeEvent;
          const bottom =
            contentSize.height - contentOffset.y - layoutMeasurement.height <
            50;
          follow.current = bottom;
          setAway(!bottom);
        }}
        scrollEventThrottle={100}
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              minHeight: 90,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Ionicons name="chatbubbles-outline" size={28} color={c.muted} />
            <Label style={{ fontWeight: "700" }}>
              Aquí empieza el momento.
            </Label>
            <Muted style={{ fontSize: 12 }}>
              Saluda a tu gente o reacciona al contenido.
            </Muted>
          </View>
        }
        renderItem={({ item }) =>
          item.kind === "system" ? (
            <Muted style={{ textAlign: "center", fontSize: 11, padding: 8 }}>
              {item.text}
            </Muted>
          ) : (
            <View
              style={{
                alignSelf:
                  item.senderId === p.userId ? "flex-end" : "flex-start",
                maxWidth: "88%",
                flexDirection: "row",
                gap: 7,
              }}
            >
              {item.senderId !== p.userId && (
                <Avatar
                  member={{ id: item.senderId, name: item.sender }}
                  size={26}
                />
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mensaje de ${item.sender}: ${item.text}. Opciones`}
                onPress={() =>
                  p.onMember({ id: item.senderId, name: item.sender })
                }
                style={{
                  padding: 11,
                  gap: 5,
                  borderRadius: 16,
                  borderTopLeftRadius: item.senderId === p.userId ? 16 : 4,
                  borderTopRightRadius: item.senderId === p.userId ? 4 : 16,
                  backgroundColor:
                    item.senderId === p.userId ? "#253D53" : c.surface,
                }}
              >
                <Label
                  style={{
                    fontSize: 10,
                    fontWeight: "800",
                    color: c.primaryText,
                  }}
                >
                  {item.senderId === p.userId ? "Tú" : item.sender}
                </Label>
                <Label style={{ fontSize: 13 }}>{item.text}</Label>
                <Muted style={{ fontSize: 9, alignSelf: "flex-end" }}>
                  {new Date(item.at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Muted>
              </Pressable>
            </View>
          )
        }
      />
      {away && (
        <View style={{ alignItems: "center", paddingBottom: 6 }}>
          <Chip
            label="Últimos mensajes"
            icon="arrow-down"
            onPress={() => {
              follow.current = true;
              setAway(false);
              list.current?.scrollToEnd({ animated: true });
            }}
          />
        </View>
      )}
      <View
        style={{
          paddingHorizontal: 14,
          paddingTop: 4,
          paddingBottom: 10,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
          {["❤️", "🔥", "👏", "😂", "🎵"].map((emoji) => (
            <Pressable
              key={emoji}
              accessibilityRole="button"
              accessibilityLabel={`Reaccionar ${emoji}`}
              disabled={!p.connected}
              onPress={() => void p.act("React", p.room.id, emoji)}
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Label style={{ fontSize: 21 }}>{emoji}</Label>
            </Pressable>
          ))}
          <View style={{ flex: 1 }} />
          {!!p.reaction && <Label>{p.reaction}</Label>}
        </View>
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            alignItems: "flex-end",
          }}
        >
          <TextInput
            accessibilityLabel="Mensaje para la sala"
            value={p.text}
            onChangeText={p.onText}
            placeholder="Comparte lo que estás sintiendo…"
            placeholderTextColor={c.muted}
            maxLength={300}
            multiline
            style={{
              flex: 1,
              minHeight: 46,
              maxHeight: 100,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: c.surface,
              color: c.text,
              fontSize: 13,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
            disabled={!p.connected || p.busy || !p.text.trim()}
            onPress={p.send}
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: p.text.trim() ? c.primary : c.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="arrow-up"
              size={22}
              color={p.text.trim() ? c.onPrimary : c.muted}
            />
          </Pressable>
        </View>
      </View>
    </>
  );
}
export function RoomQueue(p: RoomLayoutProps) {
  const c = useTheme();
  const queue = orderedQueue(p.room.queue);
  const name = (id: string) =>
    p.room.members.find((x) => x.id === id)?.name ?? "Alguien de la sala";
  return (
    <FlatList
      data={queue}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 14, gap: 12, flexGrow: 1 }}
      ListHeaderComponent={
        <View style={{ gap: 10, paddingBottom: 16 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Label style={{ fontSize: 18, fontWeight: "800" }}>
                El próximo momento
              </Label>
              <Muted style={{ fontSize: 11 }}>
                Primero lo fijado; después, lo más votado.
              </Muted>
            </View>
            <IconButton
              icon="add"
              label="Proponer contenido"
              onPress={() => p.onSheet("add")}
            />
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={{ gap: 14, alignItems: "center", paddingVertical: 30 }}>
          <Ionicons name="list-outline" size={32} color={c.muted} />
          <Label style={{ fontWeight: "700" }}>Todos pueden proponer.</Label>
          <Muted style={{ textAlign: "center" }}>
            Añade algo que te gustaría compartir después.
          </Muted>
          <Button title="Proponer contenido" onPress={() => p.onSheet("add")} />
        </View>
      }
      renderItem={({ item, index }) => (
        <View
          style={{
            padding: 12,
            gap: 10,
            borderRadius: 18,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: item.pinned ? c.primary : c.border,
          }}
        >
          <View style={{ flexDirection: "row", gap: 10 }}>
            <MediaPoster
              media={item.media}
              style={{ width: 92, height: 64, borderRadius: 10 }}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Label
                style={{
                  fontSize: 10,
                  color: item.pinned ? c.primaryText : c.muted,
                  fontWeight: "800",
                }}
              >
                {item.pinned ? "FIJADO PARA DESPUÉS" : `PROPUESTA ${index + 1}`}
              </Label>
              <Label
                numberOfLines={2}
                style={{ fontSize: 13, fontWeight: "700" }}
              >
                {item.media.title}
              </Label>
              <Muted style={{ fontSize: 10 }}>
                Por {name(item.proposedBy)}
              </Muted>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Chip
              label={`${item.votes} ${item.votes === 1 ? "voto" : "votos"}`}
              icon={
                p.votes.includes(item.id) ? "thumbs-up" : "thumbs-up-outline"
              }
              selected={p.votes.includes(item.id)}
              onPress={() => void p.act("Vote", p.room.id, item.id)}
            />
            <View style={{ flex: 1 }} />
            {p.controller && (
              <>
                <IconButton
                  icon={item.pinned ? "pin" : "pin-outline"}
                  label={
                    item.pinned
                      ? "Quitar prioridad"
                      : "Fijar para reproducir después"
                  }
                  onPress={() => void p.act("PinQueued", p.room.id, item.id)}
                />
                <IconButton
                  icon="play"
                  label="Reproducir ahora"
                  onPress={() => void p.act("PlayQueued", p.room.id, item.id)}
                />
                <IconButton
                  icon="close"
                  label="Retirar propuesta"
                  onPress={() => void p.act("RemoveQueued", p.room.id, item.id)}
                />
              </>
            )}
          </View>
        </View>
      )}
    />
  );
}
export function RoomPeople(p: RoomLayoutProps) {
  const c = useTheme();
  const isOwner = p.userId === p.room.ownerId;
  const exit = () =>
    router.canGoBack() ? router.back() : router.replace("/rooms");
  return (
    <FlatList
      data={p.room.members}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 14, gap: 8 }}
      ListHeaderComponent={
        <View style={{ paddingBottom: 12 }}>
          <Label style={{ fontSize: 18, fontWeight: "800" }}>
            La gente del momento
          </Label>
          <Muted style={{ fontSize: 11 }}>
            {p.room.autoRecovery
              ? "Continuidad activada · 60 s de margen al desconectar"
              : "El anfitrión conserva el control al desconectar"}
          </Muted>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Opciones de ${item.name}`}
          onPress={() => p.onMember(item)}
          style={{
            flexDirection: "row",
            gap: 12,
            alignItems: "center",
            padding: 12,
            borderRadius: 16,
            backgroundColor: c.surface,
          }}
        >
          <Avatar member={item} size={38} host={item.id === p.room.ownerId} />
          <View style={{ flex: 1 }}>
            <Label style={{ fontSize: 14, fontWeight: "700" }}>
              {item.name}
              {item.id === p.userId ? " · Tú" : ""}
            </Label>
            <Muted style={{ fontSize: 11 }}>
              {item.id === p.room.ownerId
                ? "Anfitrión"
                : p.room.cohosts?.includes(item.id)
                  ? "Coanfitrión"
                  : p.mutedMembers.includes(item.id)
                    ? "Silenciado para ti"
                    : "Disfrutando el momento"}
            </Muted>
          </View>
          <Ionicons name="ellipsis-horizontal" size={20} color={c.muted} />
        </Pressable>
      )}
      ListFooterComponent={
        <View style={{ gap: 10, paddingTop: 24 }}>
          {isOwner && (
            <>
              <Muted>
                Los coanfitriones pueden pausar, avanzar y gestionar la cola.
                Solo tú moderas y renuevas invitaciones.
              </Muted>
              {(p.room.cohosts ?? []).some(id => !p.room.members.some(member => member.id === id)) && <Button title="Retirar controles de coanfitriones desconectados" secondary disabled={p.busy} onPress={() => {void (async () => {for (const id of p.room.cohosts ?? []) {if (!p.room.members.some(member => member.id === id)) await p.act('SetCohost', p.room.id, id, false);}})();}}/>}
              <Button
                title="Cerrar sala para todos"
                secondary
                icon="stop-circle-outline"
                onPress={() => p.onSheet("close")}
              />
            </>
          )}
          <Button
            title="Reportar sala"
            secondary
            icon="flag-outline"
            onPress={() => p.onSheet("report")}
          />
          <Button
            title="Salir de la sala"
            secondary
            icon="log-out-outline"
            onPress={exit}
          />
        </View>
      }
    />
  );
}
