import {useEffect, useMemo, useRef} from 'react';
import {View, useWindowDimensions} from 'react-native';
import {WebView} from 'react-native-webview';
import {apiBase} from '../../api';
import {roomPlayerHtml} from './player-html';
import {FramePlaybackAdapter, providerCapabilities} from './playback-adapters';
import {projectedPosition, type RoomMedia} from './types';

export type MediaEvent = {kind: 'ready' | 'progress' | 'control' | 'ended' | 'error' | 'tap' | 'started' | 'source'; position?: number; duration?: number; playing?: boolean; code?: number; url?: string};
export type FrameProps = {media: RoomMedia; host: boolean; playing: boolean; position: number; muted: boolean; onEvent: (event: MediaEvent) => void; theater?: boolean; positionAt?: number; revision?: number};
export function MediaFrame({media, host, playing, position, positionAt, muted, onEvent, theater, revision}: FrameProps) {
  const window = useWindowDimensions();
  const ref = useRef<WebView>(null); const callback = useRef(onEvent); const mounted = useRef(true);
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);
  const state = useRef({playing, position, positionAt, muted, revision});
  useEffect(() => {callback.current = onEvent; state.current = {playing, position, positionAt, muted, revision};}, [onEvent, playing, position, positionAt, muted, revision]);
  const descriptor = JSON.stringify(media);
  const html = useMemo(() => roomPlayerHtml(JSON.parse(descriptor), host, apiBase), [descriptor, host]);
  // Every command to the isolated player goes through the PlaybackAdapter contract.
  const adapter = useRef<FramePlaybackAdapter | null>(null);
  useEffect(() => {
    const created = new FramePlaybackAdapter(media.kind, providerCapabilities[media.kind],
      command => ref.current?.injectJavaScript(`window.setRoomPlayback&&window.setRoomPlayback(${JSON.stringify(command)});true;`));
    adapter.current = created;
    return () => {void created.dispose();};
  }, [descriptor, media.kind]);
  const apply = () => {const current = state.current; adapter.current?.sync({muted: current.muted, playing: current.playing, position: projectedPosition(current.position, current.playing, current.positionAt), revision: current.revision});};
  useEffect(() => {apply();}, [playing, position, positionAt, muted, html, revision]);
  return <View style={{minHeight: 190, height: theater ? Math.max(220, window.height * .52) : media.kind === 'audio' ? 210 : undefined, aspectRatio: !theater && media.kind !== 'audio' ? 16 / 9 : undefined, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000000'}}>
    <WebView ref={ref} source={{html, baseUrl: apiBase}} originWhitelist={['https://*', 'about:blank']} javaScriptEnabled
      mediaPlaybackRequiresUserAction={false} allowsInlineMediaPlayback allowsFullscreenVideo mixedContentMode="never" setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={req => {
        if (req.url === 'about:blank') return true;
        try {const url = new URL(req.url); return url.origin === new URL(apiBase).origin || url.protocol === 'https:' && ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname);} catch {return false;}
      }}
      onMessage={message => {if (!mounted.current) return; try {const event = JSON.parse(message.nativeEvent.data) as MediaEvent; adapter.current?.handle(event); if (event.kind === 'ready') apply(); callback.current(event);} catch {/* Ignore malformed frame events. */}}}
      onError={() => callback.current({kind: 'error'})}/>
  </View>;
}
