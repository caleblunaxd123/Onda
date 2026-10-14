import { useRef, useState } from "react";
import { Modal, View, useWindowDimensions } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, IconButton, Label, Muted, SearchField } from "../../ui";
import { useTheme } from "../../theme";
import { canBrowseYoutube, youtubeBrowseUrl, youtubeVideoUrl } from "./youtube-navigation";

export function YoutubeBrowser({ onSelect }: { onSelect: (url: string) => void }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const size = useWindowDimensions();
  const ref = useRef<WebView>(null);
  const picking = useRef(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [url, setUrl] = useState(youtubeBrowseUrl(""));
  const [back, setBack] = useState(false);
  const [failure, setFailure] = useState("");
  const select = (value: string) => {
    const video = youtubeVideoUrl(value);
    if (!video || picking.current) return false;
    picking.current = true;
    setOpen(false);
    onSelect(video);
    return true;
  };
  return <>
    <Button title="Navegar en YouTube" secondary icon="logo-youtube" onPress={() => {
      picking.current = false; setFailure(""); setBack(false); setUrl(youtubeBrowseUrl(query)); setOpen(true);
    }} />
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: 12, gap: 8 }}>
          <IconButton icon="chevron-back" label="Página anterior de YouTube" disabled={!back} onPress={() => ref.current?.goBack()} />
          <Label style={{ flex: 1, fontWeight: "800", fontSize: 18 }}>Explorar YouTube</Label>
          <IconButton icon="close" label="Volver a la sala" onPress={() => setOpen(false)} />
        </View>
        <View style={{ paddingHorizontal: 14, gap: 8, paddingBottom: 12 }}>
          <SearchField value={query} onChange={(text) => setQuery(text.slice(0, 200))} placeholder="Video, artista o canal" label="Buscar en YouTube" />
          <Button title="Buscar videos" secondary icon="search-outline" onPress={() => { setFailure(""); setUrl(youtubeBrowseUrl(query)); }} />
          <Muted style={{ fontSize: 12 }}>Toca un video para elegirlo. Después podrás compartirlo con la sala o añadirlo a la cola.</Muted>
          {!!failure && <Muted accessibilityRole="alert">{failure}</Muted>}
        </View>
        {open && <WebView ref={ref} source={{ uri: url }} style={{ flex: 1, minHeight: size.height * .35 }}
          incognito javaScriptEnabled originWhitelist={["*"]} mixedContentMode="never"
          mediaPlaybackRequiresUserAction allowsInlineMediaPlayback setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={(request) => {
            if (request.isTopFrame === false) return request.url.startsWith("https://");
            if (select(request.url)) return false;
            const allowed = canBrowseYoutube(request.url);
            if (!allowed) setFailure("Elige un video público de YouTube. Los enlaces externos se quedan fuera del explorador.");
            return allowed;
          }}
          onNavigationStateChange={(state) => { setBack(state.canGoBack); select(state.url); }}
          onError={() => setFailure("No se pudo abrir YouTube. Reintenta la búsqueda o pega el enlace del video.")}
          onHttpError={({ nativeEvent }) => { if (nativeEvent.statusCode >= 400) setFailure("YouTube no respondió. Puedes reintentar o pegar el enlace."); }}
        />}
      </View>
    </Modal>
  </>;
}
