import { useState } from "react";
import { View } from "react-native";
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
  const [pending, setPending] = useState<number | null>(null);
  const commit = (value: string) => {
    if (enabled && duration > 0)
      seek(Math.max(0, Math.min(duration, Number(value))));
    setPending(null);
  };
  return (
    <View style={{ gap: 0 }}>
      <input
        type="range"
        aria-label="Posición del contenido"
        aria-valuetext={clock(pending ?? position) + " de " + clock(duration)}
        min={0}
        max={Math.max(1, duration)}
        step={0.5}
        value={Math.min(duration || 1, pending ?? position)}
        disabled={!enabled || duration <= 0}
        onChange={(event) => setPending(Number(event.currentTarget.value))}
        onPointerUp={(event) => commit(event.currentTarget.value)}
        onPointerCancel={() => setPending(null)}
        onKeyUp={(event) => {
          if (
            [
              "ArrowLeft",
              "ArrowRight",
              "Home",
              "End",
              "PageUp",
              "PageDown",
            ].includes(event.key)
          )
            commit(event.currentTarget.value);
        }}
        onBlur={(event) => {
          if (pending !== null) commit(event.currentTarget.value);
        }}
        style={{
          width: "100%",
          height: 44,
          margin: 0,
          accentColor: c.primary,
          cursor: enabled ? "pointer" : "default",
          backgroundColor: "transparent",
        }}
      />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: -7,
        }}
      >
        <Muted style={{ fontSize: 11 }}>{clock(pending ?? position)}</Muted>
        <Muted style={{ fontSize: 11 }}>
          {duration ? clock(duration) : "—"}
        </Muted>
      </View>
    </View>
  );
}
