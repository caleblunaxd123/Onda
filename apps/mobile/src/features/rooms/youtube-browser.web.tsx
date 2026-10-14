import { useState } from "react";
import { View } from "react-native";
import { Button, Muted, SearchField } from "../../ui";
import { youtubeBrowseUrl } from "./youtube-navigation";

export function YoutubeBrowser({ onSelect: _onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  return <View style={{ gap: 8 }}>
    <SearchField value={query} onChange={(text) => setQuery(text.slice(0, 200))} placeholder="Video, artista o canal" label="Buscar en YouTube" />
    <Button title="Buscar en YouTube" secondary icon="logo-youtube" onPress={() => {
      window.open(youtubeBrowseUrl(query), "_blank", "noopener,noreferrer");
    }} />
    <Muted style={{ fontSize: 12 }}>YouTube abre en otra pestaña. Copia el enlace del video y pégalo aquí para verlo con tu grupo. En Android puedes elegirlo dentro de ONDA.</Muted>
    <Button title="Cerrar búsqueda" secondary onPress={onClose} />
  </View>;
}
