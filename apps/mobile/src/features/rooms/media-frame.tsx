import {useEffect, useMemo, useRef} from 'react';
import {View} from 'react-native';
import {WebView} from 'react-native-webview';
import {apiBase} from '../../api';
import {roomPlayerHtml} from './player-html';
import type {RoomMedia} from './types';

export type MediaEvent = {kind: 'ready' | 'progress' | 'control' | 'ended' | 'error' | 'tap'; position?: number; duration?: number; playing?: boolean; code?: number};
export type FrameProps = {media: RoomMedia; host: boolean; playing: boolean; position: number; muted: boolean; onEvent: (event: MediaEvent) => void};
export function MediaFrame({media, host, playing, position, muted, onEvent}: FrameProps) {
  const ref = useRef<WebView>(null); const callback = useRef(onEvent);
  const state = useRef({playing, position, muted});
  useEffect(() => {callback.current = onEvent; state.current = {playing, position, muted};}, [onEvent, playing, position, muted]);
  const descriptor = JSON.stringify(media);
  const html = useMemo(() => roomPlayerHtml(JSON.parse(descriptor), host, apiBase), [descriptor, host]);
  const apply = () => ref.current?.injectJavaScript(`window.setRoomPlayback&&window.setRoomPlayback(${JSON.stringify(state.current)});true;`);
  useEffect(() => {apply();}, [playing, position, muted, html]);
  return <View style={{minHeight: 220, height: media.kind === 'audio' ? 220 : 260, borderRadius: 20, overflow: 'hidden', backgroundColor: '#080f20'}}>
    <WebView ref={ref} source={{html, baseUrl: apiBase}} originWhitelist={['https://*', 'about:blank']} javaScriptEnabled
      mediaPlaybackRequiresUserAction={false} allowsInlineMediaPlayback allowsFullscreenVideo mixedContentMode="never" setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={req => {
        if (req.url === 'about:blank') return true;
        try {const url = new URL(req.url); return url.origin === new URL(apiBase).origin || url.protocol === 'https:' && ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname);} catch {return false;}
      }}
      onMessage={message => {try {const event = JSON.parse(message.nativeEvent.data) as MediaEvent; if (event.kind === 'ready') apply(); callback.current(event);} catch {/* Ignore malformed frame events. */}}}
      onError={() => callback.current({kind: 'error'})}/>
  </View>;
}
