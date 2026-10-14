import {gradientStyle, useTheme} from '../../theme';
import { useState, type ReactNode } from "react";
import { Image, View, type ViewStyle, useWindowDimensions } from "react-native";
import { Ionicons } from "../../icons";
import {OndaGradientButton, OndaGlassSurface, OndaPressable} from '../../components/experience';
import {Button} from '../../components/controls';
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
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
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
        overflow: 'hidden',
      }}
    >
      <Label
        style={{ fontWeight: "800", fontSize: size * 0.36, color: "#FFFFFF" }}
      >
        {member.name.trim().slice(0, 1).toUpperCase()}
      </Label>
      {member.avatarUrl && failedAvatar !== member.avatarUrl && <Image source={{uri: member.avatarUrl}} resizeMode="cover"
        onError={() => setFailedAvatar(member.avatarUrl ?? null)} style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%'}}/>}
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
/** Compact landscape row with real presence only; large text may expand it. */
export function RoomRow({room, onPress, ownerName}: {room: RoomSummary; onPress: () => void; ownerName?: string}) {
  const c = useTheme(); const {width, fontScale} = useWindowDimensions();
  const stacked = width < 320 || fontScale > 1.5;
  const label = room.media.kind === 'youtube' ? 'YouTube' : room.media.kind === 'radio' ? 'Radio' : room.media.kind === 'audio' ? 'Música' : room.media.kind === 'stream' ? 'Servicio externo' : 'Video';
  return <OndaPressable accessibilityRole="button" accessibilityLabel={`Unirse a ${room.name}: ${room.media.title}, ${room.listeners} personas conectadas`} onPress={onPress}
    style={{padding: 6, gap: 10, borderRadius: 20, borderWidth: 1, borderColor: c.border, flexDirection: stacked ? 'column' : 'row',
      ...gradientStyle(c.isDark ? 'linear-gradient(135deg, #202451EF 0%, #111A3FEE 65%, #30215BEE 100%)' : 'linear-gradient(130deg, #FFFFFF 10%, #F0EAFE 100%)', c.surface), boxShadow: c.shadow}}>
    <View style={stacked ? {} : {width: '40%'}}>
      <MediaPoster media={room.media} style={{height: stacked ? 120 : 96, borderRadius: 14}}>
        <View style={{position: 'absolute', top: 9, left: 8, right: 8, alignItems: 'flex-start'}}>
          <View style={{paddingHorizontal: 7, paddingVertical: 4, borderRadius: 10, backgroundColor: '#0F174DDD', borderWidth: 1, borderColor: '#FFFFFF35'}}>
            <Label style={{color: '#FFFFFF', fontWeight: '700', fontSize: 10, lineHeight: 13}}>{label}</Label>
          </View>
        </View>
        {room.media.kind === 'radio' && !!room.media.url && <View style={{position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 5}}><View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF386B'}}/><Label style={{color: '#FFFFFF', fontSize: 10, fontWeight: '800'}}>En vivo</Label></View>}
      </MediaPoster>
    </View>
    <View style={{flex: 1, gap: 4, paddingVertical: 2, paddingRight: 3}}>
      <Label numberOfLines={2} style={{fontSize: 15, lineHeight: 18, fontWeight: '800'}}>{room.media.title}</Label>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
        <Ionicons name={room.isPrivate ? 'lock-closed-outline' : 'earth-outline'} size={13} color={c.primaryText}/>
        <Muted numberOfLines={1} style={{fontSize: 11, lineHeight: 14, flex: 1}}>{ownerName ? `Tu sala · ${room.name}` : room.name}</Muted>
      </View>
      <View style={{marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingTop: 3}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>{room.members?.length ? <MemberStack members={room.members} owner={room.ownerId} max={3}/> : <Ionicons name="people-outline" size={14} color={c.primaryText}/>}<Muted style={{fontSize: 11, lineHeight: 14}}>{room.listeners}</Muted></View>
        <View style={{minHeight: 34, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 5, ...gradientStyle(c.brand, c.primary)}}><Ionicons name="play" size={14} color="#FFFFFF"/><Label style={{color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontWeight: '800'}}>Unirse</Label></View>
      </View>
    </View>
  </OndaPressable>;
}
export function OndaContentCard({media, onWatch, onShare, onRemove}: {media: RoomMedia; onWatch: () => void; onShare: () => void; onRemove?: () => void}) {
  return <OndaGlassSurface style={{padding: 9}}><MediaPoster media={media} style={{height: 180}}/><View style={{padding: 8, gap: 10}}><Label style={{fontSize: 19, lineHeight: 25, fontWeight: '800'}}>{media.title}</Label><Muted>{media.kind === 'youtube' ? 'YouTube' : media.kind === 'audio' ? 'Música por enlace' : media.kind === 'stream' ? 'Servicio externo · reloj manual' : 'Video por enlace'}</Muted><OndaGradientButton title="Reproducir" icon="play" onPress={onWatch}/><Button title="Compartir en una sala" secondary icon="people-outline" onPress={onShare}/>{onRemove && <Button title="Quitar de mi biblioteca" secondary icon="bookmark-outline" onPress={onRemove}/>}</View></OndaGlassSurface>;
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
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: c.surface,
      }}
    >
      {media.station && <Artwork station={media.station} size={64} round />}
      <View style={{flex: 1, gap: 8}}>
      <Label
        numberOfLines={2}
        style={{ fontSize: 18, fontWeight: "800" }}
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
    </View>
  );
}
