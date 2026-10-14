import { useDeferredValue, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { lookupStations, useStationFeed } from "../../catalog";
import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useLibrary } from "../../library";
import { useTheme } from "../../theme";
import {
  Artwork,
  Button,
  Chip,
  Label,
  Loading,
  Message,
  Muted,
  SearchField,
} from "../../ui";
import { FormField } from "../../components/forms";
import type { Station } from "../../types";
import type { MediaInput } from "./types";
import { MediaPoster } from "./presentation";
import { YoutubeBrowser } from "./youtube-browser";
import { StreamForm } from "./stream";
import { youtubeVideoUrl } from "./youtube-navigation";
export function SourcePicker({
  value,
  onChange,
  initialStation,
  openYoutubeInitially = false,
  youtubeQuery = "",
  onChoose,
  onBrowseClose,
}: {
  value: MediaInput;
  onChange: (value: MediaInput) => void;
  initialStation?: Station | null;
  openYoutubeInitially?: boolean;
  youtubeQuery?: string;
  onChoose?: (value: MediaInput) => void;
  onBrowseClose?: () => void;
}) {
  const c = useTheme();
  const country = useLibrary((s) => s.country);
  const bookmarks = useLibrary((s) => s.mediaFavorites);
  const [pasteError, setPasteError] = useState("");
  const [youtubeOpen, setYoutubeOpen] = useState(openYoutubeInitially);
  const [details, setDetails] = useState(false);
  const youtubeSelected = value.kind === "youtube";
  const youtubeUrl = value.url && youtubeVideoUrl(value.url);
  const choose = (input: MediaInput) => { onChange(input); onChoose?.(input); };
  const paste = async () => {
    try {
      const text = (await Clipboard.getStringAsync()).trim();
      if (text.length > 2000 || !/^https:\/\//i.test(text)) {
        setPasteError(
          "Copia un enlace HTTPS de YouTube o un archivo compatible.",
        );
        return;
      }
      onChange({ ...value, url: text });
      setPasteError("");
    } catch {
      setPasteError(
        "No se pudo pegar. Mantén pulsado el campo para usar Pegar.",
      );
    }
  };
  const [text, setText] = useState("");
  const q = useDeferredValue(text);
  const [picked, setSelected] = useState<Station | null>(
    initialStation ?? null,
  );
  const lookup = useQuery({
    queryKey: ["room-station", value.stationId],
    queryFn: () => lookupStations([value.stationId!]),
    enabled:
      value.kind === "radio" &&
      !!value.stationId &&
      picked?.id !== value.stationId,
    staleTime: 300000,
  });
  const selected =
    picked?.id === value.stationId ? picked : (lookup.data?.[0] ?? picked);
  const feed = useStationFeed(
    { q: q || undefined, country: q ? undefined : country },
    { enabled: value.kind === "radio", limit: 12 },
  );
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {(
          [
            { kind: "radio", label: "Radio", icon: "radio-outline" },
            { kind: "youtube", label: "YouTube", icon: "logo-youtube" },
            { kind: "audio", label: "Música", icon: "musical-notes-outline" },
            { kind: "video", label: "Enlace", icon: "link-outline" },
            { kind: "stream", label: "Con tu cuenta", icon: "tv-outline" },
          ] as const
        ).map((item) => (
          <Chip
            key={item.kind}
            label={item.label}
            icon={item.icon}
            selected={value.kind === item.kind}
            onPress={() => {
              if (item.kind === "youtube") {
                if (!youtubeSelected) onChange({ kind: "youtube" });
                setYoutubeOpen(true);
                return;
              }
              setYoutubeOpen(false);
              onChange(
                item.kind === "radio" && selected
                  ? { kind: "radio", stationId: selected.id }
                  : { kind: item.kind },
              );
            }}
          />
        ))}
      </View>
      {value.kind === "radio" ? (
        <>
          {selected && value.stationId === selected.id ? (
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                alignItems: "center",
                padding: 12,
                borderRadius: 18,
                backgroundColor: c.accentSoft,
              }}
            >
              <Artwork station={selected} size={52} />
              <View style={{ flex: 1 }}>
                <Label numberOfLines={2} style={{ fontWeight: "800" }}>
                  {selected.name}
                </Label>
                <Muted>{selected.country}</Muted>
              </View>
              <Chip
                label="Cambiar"
                onPress={() => onChange({ kind: "radio" })}
              />
            </View>
          ) : (
            <>
              <SearchField
                value={text}
                onChange={(value) => setText(value.slice(0, 100))}
                placeholder="Buscar una emisora"
                label="Buscar contenido de radio"
              />
              {feed.isPending ? (
                <Loading />
              ) : feed.isError ? (
                <Message
                  title="No se pudo buscar"
                  body={feed.error.message}
                  retry={() => feed.refetch()}
                />
              ) : (
                feed.items.map((station) => (
                  <Pressable
                    key={station.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Usar ${station.name}`}
                    onPress={() => {
                      setSelected(station);
                      choose({ kind: "radio", stationId: station.id });
                    }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      padding: 10,
                      borderRadius: 16,
                      backgroundColor: c.surface,
                      borderWidth: 1,
                      borderColor: c.border,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Artwork station={station} size={42} />
                    <View style={{ flex: 1 }}>
                      <Label numberOfLines={1} style={{ fontWeight: "700" }}>
                        {station.name}
                      </Label>
                      <Muted>{station.country}</Muted>
                    </View>
                  </Pressable>
                ))
              )}
              {feed.hasNextPage && (
                <Button
                  title={feed.isFetchingNextPage ? "Cargando…" : "Más emisoras"}
                  secondary
                  onPress={feed.loadMore}
                  disabled={feed.isFetchingNextPage}
                />
              )}
              {!feed.isPending && !feed.items.length && (
                <Muted>
                  No encontramos radios con esa búsqueda. Prueba otro nombre.
                </Muted>
              )}
            </>
          )}
        </>
      ) : value.kind === "stream" ? (
        <StreamForm value={value} onChange={onChange} />
      ) : (
        <>
          {youtubeOpen && <YoutubeBrowser initialQuery={youtubeQuery} onClose={() => {setYoutubeOpen(false); onBrowseClose?.();}} onSelect={(url) => {
            setYoutubeOpen(false);
            choose({ kind: value.kind === "audio" ? "audio" : "youtube", url });
          }} />}
          {youtubeSelected && Platform.OS !== "web" && (
            <View style={{ gap: 10 }}>
              {youtubeUrl ? <MediaPoster media={{kind: "youtube", title: value.title || "Video seleccionado", url: youtubeUrl, videoId: new URL(youtubeUrl).searchParams.get("v"), station: null}} style={{ height: 135 }} /> : <Muted>Toca YouTube para elegir un video.</Muted>}
              <Button title={details ? "Ocultar enlace" : "Usar un enlace"} secondary icon="link-outline" onPress={() => setDetails((x) => !x)} />
            </View>
          )}
          {bookmarks.some((x) =>
            value.kind === "audio"
              ? x.media.category === "music" || x.media.kind === "audio"
              : x.media.category !== "music" && x.media.kind !== "audio",
          ) && (
            <View style={{ gap: 8 }}>
              <Muted style={{ fontSize: 12 }}>DE TU BIBLIOTECA</Muted>
              {bookmarks
                .filter((x) =>
                  value.kind === "audio"
                    ? x.media.category === "music" || x.media.kind === "audio"
                    : x.media.category !== "music" && x.media.kind !== "audio",
                )
                .slice(0, 3)
                .map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={"Usar " + item.media.title}
                    onPress={() =>
                      choose({
                        kind:
                          value.kind === "audio" ? "audio" : item.media.kind,
                        url: item.media.url ?? undefined,
                        title: item.media.title,
                      })
                    }
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      alignItems: "center",
                      backgroundColor: c.surface,
                      padding: 10,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: c.border,
                    }}
                  >
                    <MediaPoster
                      media={item.media}
                      style={{ width: 70, height: 48, borderRadius: 8 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Label
                        numberOfLines={2}
                        style={{ fontSize: 12, fontWeight: "700" }}
                      >
                        {item.media.title}
                      </Label>
                    </View>
                  </Pressable>
                ))}
            </View>
          )}
          {(!youtubeSelected || details || Platform.OS === "web") && <>
          <FormField
            label={
              value.kind === "audio" ? "Enlace de música" : "Enlace de video"
            }
            value={value.url ?? ""}
            onChange={(url) => onChange({ ...value, url })}
            placeholder={
              value.kind === "audio"
                ? "YouTube, YouTube Music o archivo MP3 HTTPS"
                : "Enlace de YouTube o archivo MP4/WebM HTTPS"
            }
            keyboardType="url"
            maxLength={2000}
          />
          <Button
            title="Pegar enlace"
            secondary
            icon="clipboard-outline"
            onPress={() => void paste()}
          />
          {pasteError && <Muted accessibilityRole="alert">{pasteError}</Muted>}
          <FormField
            label="Título (opcional)"
            value={value.title ?? ""}
            onChange={(title) => onChange({ ...value, title })}
            placeholder="Cómo aparecerá en la sala"
            maxLength={120}
          />
          <Muted>
            {value.kind === "audio"
              ? "YouTube y YouTube Music se reproducen con su video. También MP3, M4A, OGG, AAC o WAV en HTTPS."
              : "YouTube y archivos MP4/WebM públicos. Los videos que bloqueen la reproducción integrada mostrarán una explicación."}
          </Muted>
          </>}
        </>
      )}
    </View>
  );
}
