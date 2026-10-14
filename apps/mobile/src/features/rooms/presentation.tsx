import {gradientStyle, useTheme} from '../../theme';
import { useState, type ReactNode } from "react";
import { Image, Pressable, View, type ViewStyle } from "react-native";
import { Ionicons } from "../../icons";
import { Artwork, Label, Muted } from "../../ui";
import type { Member, RoomMedia, RoomSummary } from "./types";

export function Avatar({
  member,
  size = 30,
  host = false,
}: {
  member: Member;
  size?: number;
  host?: boolean;
}) {
  const c = useTheme();
  const hue = [...member.id].reduce((sum, x) => sum + x.charCodeAt(0), 0) % 4;
  const colors = ["#533887", "#165E77", "#735231", "#69445C"];
  return (
    <View
      accessibilityLabel={member.name + (host ? ", anfitrión" : "")}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors[hue],
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: host ? c.primary : c.bg,
      }}
    >
      <Label
        style={{ fontWeight: "800", fontSize: size * 0.36, color: "#FFFFFF" }}
      >
        {member.name.trim().slice(0, 1).toUpperCase()}
      </Label>
    </View>
  );
}
export function MemberStack({
  members,
  owner,
  max = 4,
}: {
  members: Member[];
  owner: string;
  max?: number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {members.slice(0, max).map((member, index) => (
        <View
          key={member.id}
          style={{ marginLeft: index ? -9 : 0, zIndex: 5 - index }}
        >
          <Avatar member={member} host={member.id === owner} />
        </View>
      ))}
      {members.length > max && (
        <View style={{ marginLeft: 4 }}>
          <Muted style={{ fontSize: 10 }}>+{members.length - max}</Muted>
        </View>
      )}
    </View>
  );
}
export function MediaPoster({
  media,
  style,
  children,
}: {
  media: RoomMedia;
  style?: ViewStyle;
  children?: ReactNode;
}) {
  const c = useTheme();
  const [failed, setFailed] = useState("");
  const url = media.videoId
    ? `https://i.ytimg.com/vi/${media.videoId}/hqdefault.jpg`
    : media.station?.artworkUrl;
  return (
    <View
      style={[
        {
          height: 164,
          borderRadius: 18,
          overflow: "hidden",
          backgroundColor: c.featuredFallback,
        },
        style,
      ]}
    >
      {url && failed !== url ? (
        <Image
          source={{ uri: url }}
          accessibilityLabel={"Portada de " + media.title}
          resizeMode={media.station ? "contain" : "cover"}
          style={{ position: "absolute", width: "100%", height: "100%" }}
          onError={() => setFailed(url)}
        />
      ) : (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons
            name={
              media.kind === "radio"
                ? "radio"
                : media.kind === "audio"
                  ? "musical-notes"
                  : "videocam"
            }
            size={48}
            color="#90BDF7"
          />
        </View>
      )}
      <View
        style={{
          position: "absolute",
          inset: 0,
          ...gradientStyle("linear-gradient(180deg, rgba(8,10,16,.05) 15%, rgba(8,10,16,.92) 100%)", "transparent"),
        }}
      />
      {children}
    </View>
  );
}
/** Rave-style list row: what is playing (thumbnail + title), the room and how many people are in it. */
export function RoomRow({room, onPress}: {room: RoomSummary; onPress: () => void}) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Entrar a ${room.name}: ${room.media.title}, ${room.listeners} ${room.listeners === 1 ? "persona" : "personas"}`}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: "row", gap: 12, padding: 8, borderRadius: 18, backgroundColor: c.surface, alignItems: "center", opacity: pressed ? 0.8 : 1 })}>
      <MediaPoster media={room.media} style={{ width: 128, height: 76, borderRadius: 12 }} />
      <View style={{ flex: 1, gap: 4 }}>
        <Label numberOfLines={2} style={{ fontSize: 14, fontWeight: "800", lineHeight: 18 }}>{room.media.title}</Label>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Ionicons name={room.isPrivate ? "lock-closed" : "earth"} size={11} color={c.muted} />
          <Muted numberOfLines={1} style={{ fontSize: 11, flex: 1 }}>{room.name}</Muted>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="people" size={13} color={room.listeners ? c.primaryText : c.muted} />
          <Muted style={{ fontSize: 11, color: room.listeners ? c.primaryText : c.muted }}>
            {room.listeners ? `${room.listeners} ${room.listeners === 1 ? "persona" : "personas"} ahora` : "Nadie conectado"}
          </Muted>
        </View>
      </View>
    </Pressable>
  );
}
export function RadioStage({
  media,
  status,
}: {
  media: RoomMedia;
  status: string;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        borderRadius: 22,
        padding: 24,
        alignItems: "center",
        gap: 12,
        ...gradientStyle("linear-gradient(150deg, #17294D 0%, #211637 70%, #11141F 100%)", "#14294B"),
      }}
    >
      {media.station && <Artwork station={media.station} size={100} round />}
      <Label
        numberOfLines={2}
        style={{ fontSize: 23, fontWeight: "900", textAlign: "center" }}
      >
        {media.title}
      </Label>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: status === "En vivo" ? c.live : c.muted,
          }}
        />
        <Muted>{status}</Muted>
      </View>
    </View>
  );
}
