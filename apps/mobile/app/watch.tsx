import {useCallback, useRef, useState} from 'react';
import {View} from 'react-native';
import {router, useFocusEffect, useIsFocused, useLocalSearchParams} from 'expo-router';
import {useLibrary} from '../src/library';
import {useTheme} from '../src/theme';
import {isActive, player} from '../src/player';
import {Button, Label, Loading, Muted, Page, ScreenHeader} from '../src/ui';
import {accountRequest, ensureListener} from '../src/features/account/session';
import {MediaFrame, type MediaEvent} from '../src/features/rooms/media-frame';
import type {RoomMedia} from '../src/features/rooms/types';
export default function Watch() {
  const c = useTheme(); const params = useLocalSearchParams<{id?: string}>(); const focused = useIsFocused();
  const bookmark = useLibrary(s => s.mediaFavorites.find(x => x.id === params.id));
  const [media, setMedia] = useState<RoomMedia | null>(null); const [error, setError] = useState('');
  const [command, setCommand] = useState({playing: true, position: 0, muted: false}); const [progress, setProgress] = useState(0); const position = useRef(0);
  const id = bookmark?.id; const kind = bookmark?.media.kind; const url = bookmark?.media.url; const title = bookmark?.media.title;
  useFocusEffect(useCallback(() => {
    if (!id || !url) return;
    let cancelled = false; if (isActive(player.getSnapshot().state)) player.toggle();
    const run = async () => {
      try {await ensureListener(); const resolved = await accountRequest<RoomMedia>('/api/v1/media/resolve', {method: 'POST', body: {kind, url, title}}); if (!cancelled) setMedia(resolved);}
      catch (e) {if (!cancelled) setError(e instanceof Error ? e.message : 'No se pudo abrir este contenido.');}
    };
    void run(); return () => {cancelled = true;};
  }, [id, kind, url, title]));
  const event = (e: MediaEvent) => {
    if (e.kind === 'progress') {position.current = e.position ?? 0; setProgress(e.position ?? 0);}
    if (e.kind === 'control') setCommand(current => ({...current, playing: e.playing ?? false, position: e.position ?? 0}));
    if (e.kind === 'ended') setCommand(current => ({...current, playing: false}));
    if (e.kind === 'error') setError('No se pudo reproducir este contenido. Revisa la fuente o prueba otro enlace.');
  };
  return <View style={{flex: 1, backgroundColor: c.bg}}><ScreenHeader title={bookmark?.media.title ?? 'Tu contenido'} back/><Page>
    {!bookmark ? <Muted>Este contenido ya no está guardado en tu biblioteca.</Muted> : !media && !error ? <Loading label="Abriendo contenido…"/> : media && focused ? <><MediaFrame media={media} host playing={command.playing} position={command.position} muted={command.muted} onEvent={event}/><Label>{Math.floor(progress / 60)}:{String(Math.floor(progress) % 60).padStart(2, '0')}</Label><Button title={command.playing ? 'Pausar' : 'Reproducir'} icon={command.playing ? 'pause' : 'play'} onPress={() => setCommand(current => ({...current, position: position.current, playing: !current.playing}))}/><Button title="Compartir en una sala" secondary icon="people-outline" onPress={() => router.push({pathname: '/create-room', params: {bookmark: bookmark.id}})}/></> : null}
    {error && <Muted accessibilityRole="alert">{error}</Muted>}
  </Page></View>;
}
