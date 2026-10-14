import { useRef, useState } from "react";
import { ActivityIndicator, Modal, View } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Button, Chip, IconButton, Label, Muted, Sheet } from "../../ui";
import { FormField } from "../../components/forms";
import { Ionicons } from "../../icons";
import { useTheme } from "../../theme";
import { canBrowseYoutube, youtubeBrowseUrl, youtubeVideoUrl } from "./youtube-navigation";

export type YoutubeBrowserProps = {
  onSelect: (url: string, enqueue: boolean) => boolean | void | Promise<boolean | void>;
  onClose: () => void;
  initialQuery?: string;
  controller?: boolean;
};

/** The provider owns search/navigation; ONDA only selects a video and its destination in the room. */
export function YoutubeBrowser({ onSelect, onClose, initialQuery = "", controller = true }: YoutubeBrowserProps) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<WebView>(null);
  const picking = useRef(false);
  const [busy, setBusy] = useState(false);
  const [enqueue, setEnqueue] = useState(!controller);
  const [back, setBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const [fatal, setFatal] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [url] = useState(() => youtubeBrowseUrl(initialQuery));
  const select = (value: string) => {
    const video = youtubeVideoUrl(value);
    if (!video) return false;
    if (picking.current) return true;
    picking.current = true;
    setBusy(true); setFailure("");
    void Promise.resolve().then(() => onSelect(video, enqueue || !controller)).then(ok => {
      if (ok === false) setFailure("No se pudo compartir el video. Comprueba la conexión y vuelve a intentarlo.");
      else onClose();
    }).catch(() => setFailure("No se pudo compartir el video. Vuelve a intentarlo."))
      .finally(() => {picking.current = false; setBusy(false);});
    return true;
  };
  const previous = () => {if (busy) return; if (back && !linkOpen) ref.current?.goBack(); else onClose();};
  const failLoading = () => {setLoading(false); setFatal(true); setFailure("No se pudo cargar YouTube. Reintenta o usa un enlace.");};
  return <Modal visible animationType="slide" onRequestClose={previous}>
    <View style={{flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom}}>
      <View style={{flexDirection: "row", alignItems: "center", paddingHorizontal: 8, minHeight: 52, gap: 8}}>
        <IconButton icon="chevron-back" plain label={back ? "Página anterior de YouTube" : "Volver a la sala"} disabled={busy} onPress={previous}/>
        <Ionicons name="logo-youtube" size={25} color="#FF5268"/>
        <Label style={{flex: 1, fontWeight: "800", fontSize: 17}}>YouTube</Label>
        <IconButton icon="link-outline" plain label="Usar un enlace de YouTube" disabled={busy} onPress={() => {setFailure(""); setLinkOpen(true);}}/>
        <IconButton icon="close" plain label="Volver a la sala" disabled={busy} onPress={onClose}/>
      </View>
      <View style={{paddingHorizontal: 14, paddingBottom: 10, gap: 6}}>
        {controller ? <View style={{flexDirection: "row", gap: 8}}>
          <Chip label="Ver juntos" icon="play-outline" selected={!enqueue} onPress={() => {if (!busy) setEnqueue(false);}}/>
          <Chip label="Añadir a la cola" icon="list-outline" selected={enqueue} onPress={() => {if (!busy) setEnqueue(true);}}/>
        </View> : <Label style={{fontSize: 13, fontWeight: "700", color: c.primaryText}}>Proponer a la cola</Label>}
        <Muted style={{fontSize: 11}}>{enqueue || !controller ? "Toca un video para proponerlo. El actual sigue sonando." : "Toca un video y empieza para todo el grupo."}</Muted>
      </View>
      {!!failure && !linkOpen && <View style={{paddingHorizontal: 14, paddingBottom: 10, gap: 8}}>
        <Muted accessibilityRole="alert" style={{color: c.live}}>{failure}</Muted>
        {fatal && <Button title="Reintentar" secondary icon="refresh" onPress={() => {setFailure(""); setFatal(false); setLoading(true); ref.current?.reload();}}/>}
      </View>}
      <View style={{flex: 1}}>
        <WebView ref={ref} source={{uri: url}} style={{flex: 1}}
          incognito javaScriptEnabled originWhitelist={["*"]} mixedContentMode="never"
          mediaPlaybackRequiresUserAction allowsInlineMediaPlayback setSupportMultipleWindows={false}
          onLoadStart={() => setLoading(true)} onLoadEnd={() => setLoading(false)}
          onShouldStartLoadWithRequest={request => {
            if (request.isTopFrame === false) return request.url.startsWith("https://");
            if (select(request.url)) return false;
            const allowed = canBrowseYoutube(request.url);
            if (!allowed) setFailure("Puedes explorar YouTube aquí. Para otros servicios, cambia la fuente desde la sala.");
            return allowed;
          }}
          onNavigationStateChange={state => {setBack(state.canGoBack); select(state.url);}}
          onError={failLoading} onHttpError={({nativeEvent}) => {if (nativeEvent.statusCode >= 400) failLoading();}}
        />
        {(loading || busy) && <View pointerEvents={busy ? "auto" : "none"} style={busy
          ? {position: "absolute", inset: 0, backgroundColor: c.bg + "DD", justifyContent: "center", alignItems: "center", gap: 12}
          : {position: "absolute", top: 0, right: 12, padding: 8, borderRadius: 20, backgroundColor: c.surface}}>
          <ActivityIndicator color={c.primary}/>
          {busy && <Label>{enqueue || !controller ? "Añadiendo a la cola…" : "Compartiendo con tu sala…"}</Label>}
        </View>}
      </View>
      {linkOpen && <Sheet title="Enlace de YouTube" onClose={() => {if (!busy) setLinkOpen(false);}}>
        <FormField label="Enlace del video" value={link} onChange={setLink} keyboardType="url" maxLength={2000} placeholder="https://youtu.be/…"/>
        <Button title="Pegar enlace" secondary icon="clipboard-outline" disabled={busy} onPress={() => {
          void Clipboard.getStringAsync().then(text => setLink(text.trim().slice(0, 2000))).catch(() => setFailure("No se pudo pegar. Usa Pegar en el campo."));
        }}/>
        {!!failure && <Muted accessibilityRole="alert">{failure}</Muted>}
        {!!link && !youtubeVideoUrl(link) && <Muted>Usa el enlace de un video de YouTube.</Muted>}
        <Button title={enqueue || !controller ? "Añadir a la cola" : "Ver juntos"} icon={enqueue || !controller ? "add" : "play"}
          disabled={busy || !youtubeVideoUrl(link)} onPress={() => select(link)}/>
      </Sheet>}
    </View>
  </Modal>;
}
