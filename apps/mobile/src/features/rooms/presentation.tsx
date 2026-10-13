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
export function RoomTile({
  room,
  onPress,
}: {
  room: RoomSummary;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Entrar a ${room.name}, ${room.listeners} personas`}
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <MediaPoster media={room.media} style={{ borderRadius: 0, height: 174 }}>
        <View
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              backgroundColor: "#080A10BF",
              borderRadius: 99,
              paddingHorizontal: 9,
              paddingVertical: 5,
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Ionicons
              name={room.isPrivate ? "lock-closed" : "people"}
              size={12}
              color="#FFFFFF"
            />
            <Label
              style={{ fontSize: 11, color: "#FFFFFF", fontWeight: "700" }}
            >
              {room.isPrivate ? "Privada" : room.listeners + " en la sala"}
            </Label>
          </View>
          <Ionicons name="play-circle" size={34} color="#FFFFFF" />
        </View>
        <View style={{ position: "absolute", bottom: 14, left: 14, right: 14 }}>
          <Label
            numberOfLines={2}
            style={{ fontSize: 20, fontWeight: "900", color: "#FFFFFF" }}
          >
            {room.name}
          </Label>
        </View>
      </MediaPoster>
      <View style={{ padding: 14, gap: 6 }}>
        <Muted numberOfLines={1}>{room.media.title}</Muted>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Label
            style={{ fontSize: 11, color: c.primaryText, fontWeight: "800" }}
          >
            {room.media.kind === "radio"
              ? "RADIO EN VIVO"
              : room.media.category === "music" || room.media.kind === "audio"
                ? "MÚSICA"
                : "VER JUNTOS"}
          </Label>
          <Ionicons name="arrow-forward" size={18} color={c.text} />
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
