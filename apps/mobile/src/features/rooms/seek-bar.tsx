import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "../../theme";
import { Muted } from "../../ui";
const clock = (value: number) =>
  `${Math.floor(Math.max(0, value) / 60)}:${String(Math.floor(Math.max(0, value)) % 60).padStart(2, "0")}`;
export function SeekBar({
  position,
  duration,
  enabled,
  seek,
}: {
  position: number;
  duration: number;
  enabled: boolean;
  seek: (position: number) => void;
}) {
  const c = useTheme();
  const [width, setWidth] = useState(1);
  return (
    <View style={{ gap: 0 }}>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel={
          enabled
            ? "Posición del contenido, toca para avanzar"
            : "Posición del contenido, controla el anfitrión"
        }
        accessibilityValue={{
          min: 0,
          max: Math.round(duration),
          now: Math.round(position),
          text: clock(position) + " de " + clock(duration),
        }}
        accessibilityActions={
          enabled
            ? [
                { name: "increment", label: "Avanzar 15 segundos" },
                { name: "decrement", label: "Retroceder 15 segundos" },
              ]
            : []
        }
        onAccessibilityAction={(e) =>
          enabled &&
          seek(
            Math.max(
              0,
              Math.min(
                duration,
                position +
                  (e.nativeEvent.actionName === "increment" ? 15 : -15),
              ),
            ),
          )
        }
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onPress={(e) =>
          enabled &&
          duration > 0 &&
          seek(
            Math.max(
              0,
              Math.min(duration, (e.nativeEvent.locationX / width) * duration),
            ),
          )
        }
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <View style={{ height: 4, borderRadius: 2, backgroundColor: c.border }}>
          <View
            style={{
              height: 4,
              borderRadius: 2,
              width: `${Math.min(100, duration ? (position / duration) * 100 : 0)}%`,
              backgroundColor: c.primary,
            }}
          />
        </View>
      </Pressable>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: -7,
        }}
      >
        <Muted style={{ fontSize: 11 }}>{clock(position)}</Muted>
        <Muted style={{ fontSize: 11 }}>
          {duration ? clock(duration) : "—"}
        </Muted>
      </View>
    </View>
  );
}
