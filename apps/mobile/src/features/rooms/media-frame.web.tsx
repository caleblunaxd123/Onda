import {useEffect, useMemo, useRef} from 'react';
import {roomPlayerHtml} from './player-html';
import type {FrameProps, MediaEvent} from './media-frame';
import {FramePlaybackAdapter, providerCapabilities} from './playback-adapters';
import {projectedPosition} from './types';
export function MediaFrame({media, host, playing, position, positionAt, muted, onEvent, theater}: FrameProps) {
  const ref = useRef<HTMLIFrameElement>(null); const callback = useRef(onEvent);
  const descriptor = JSON.stringify(media);
  const html = useMemo(() => roomPlayerHtml(JSON.parse(descriptor), host, window.location.origin), [descriptor, host]);
  const state = useRef({playing, position, positionAt, muted});
  const current = () => ({muted: state.current.muted, playing: state.current.playing, position: projectedPosition(state.current.position, state.current.playing, state.current.positionAt)});
  // Every command to the isolated player goes through the PlaybackAdapter contract.
  const adapter = useRef<FramePlaybackAdapter | null>(null);
  useEffect(() => {
    const created = new FramePlaybackAdapter(media.kind, providerCapabilities[media.kind], command => ref.current?.contentWindow?.postMessage({ondaPlayback: command}, '*'));
    adapter.current = created;
    return () => {void created.dispose();};
  }, [descriptor, media.kind]);
  useEffect(() => {callback.current = onEvent; state.current = {playing, position, positionAt, muted};}, [onEvent, playing, position, positionAt, muted]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow || !event.data?.ondaMedia) return;
      const message = event.data.ondaMedia as MediaEvent;
      adapter.current?.handle(message);
      if (message.kind === 'ready') adapter.current?.sync(current());
      callback.current(message);
    };
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(() => {adapter.current?.sync(current());}, [playing, position, positionAt, muted]);
  return <iframe ref={ref} title={media.title} srcDoc={html} allow="autoplay; fullscreen; encrypted-media" sandbox="allow-scripts allow-same-origin allow-presentation" style={{width: '100%', minHeight: 190, height: theater ? 'min(55vh,480px)' : media.kind === 'audio' ? 210 : undefined, aspectRatio: !theater && media.kind !== 'audio' ? '16 / 9' : undefined, border: 0, borderRadius: 18}}/>;
}
