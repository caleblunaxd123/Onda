import {useEffect, useMemo, useRef} from 'react';
import {View, useWindowDimensions} from 'react-native';
import {WebView} from 'react-native-webview';
import {apiBase} from '../../api';
import {roomPlayerHtml} from './player-html';
import {projectedPosition, type RoomMedia} from './types';

export type MediaEvent = {kind: 'ready' | 'progress' | 'control' | 'ended' | 'error' | 'tap' | 'started'; position?: number; duration?: number; playing?: boolean; code?: number};
export type FrameProps = {media: RoomMedia; host: boolean; playing: boolean; position: number; muted: boolean; onEvent: (event: MediaEvent) => void; theater?: boolean; positionAt?: number};
export function MediaFrame({media, host, playing, position, positionAt, muted, onEvent, theater}: FrameProps) {
  const window = useWindowDimensions();
  const ref = useRef<WebView>(null); const callback = useRef(onEvent); const mounted = useRef(true);
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);
  const state = useRef({playing, position, positionAt, muted});
  useEffect(() => {callback.current = onEvent; state.current = {playing, position, positionAt, muted};}, [onEvent, playing, position, positionAt, muted]);
  const descriptor = JSON.stringify(media);
  const html = useMemo(() => roomPlayerHtml(JSON.parse(descriptor), host, apiBase), [descriptor, host]);
  const apply = () => {const current = state.current; return ref.current?.injectJavaScript(`window.setRoomPlayback&&window.setRoomPlayback(${JSON.stringify({...current, position: projectedPosition(current.position, current.playing, current.positionAt)})});true;`);};
  useEffect(() => {apply();}, [playing, position, positionAt, muted, html]);
  return <View style={{minHeight: 190, height: theater ? Math.max(220, window.height * .52) : media.kind === 'audio' ? 210 : undefined, aspectRatio: !theater && media.kind !== 'audio' ? 16 / 9 : undefined, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000000'}}>
    <WebView ref={ref} source={{html, baseUrl: apiBase}} originWhitelist={['https://*', 'about:blank']} javaScriptEnabled
      mediaPlaybackRequiresUserAction={false} allowsInlineMediaPlayback allowsFullscreenVideo mixedContentMode="never" setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={req => {
        if (req.url === 'about:blank') return true;
        try {const url = new URL(req.url); return url.origin === new URL(apiBase).origin || url.protocol === 'https:' && ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname);} catch {return false;}
      }}
      onMessage={message => {if (!mounted.current) return; try {const event = JSON.parse(message.nativeEvent.data) as MediaEvent; if (event.kind === 'ready') apply(); callback.current(event);} catch {/* Ignore malformed frame events. */}}}
      onError={() => callback.current({kind: 'error'})}/>
  </View>;
}
