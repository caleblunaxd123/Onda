import {useEffect, useMemo, useRef} from 'react';
import {roomPlayerHtml} from './player-html';
import type {FrameProps, MediaEvent} from './media-frame';
import {projectedPosition} from './types';
export function MediaFrame({media, host, playing, position, positionAt, muted, onEvent, theater}: FrameProps) {
  const ref = useRef<HTMLIFrameElement>(null); const callback = useRef(onEvent);
  const descriptor = JSON.stringify(media);
  const html = useMemo(() => roomPlayerHtml(JSON.parse(descriptor), host, window.location.origin), [descriptor, host]);
  const state = useRef({playing, position, positionAt, muted});
  const current = () => ({...state.current, position: projectedPosition(state.current.position, state.current.playing, state.current.positionAt)});
  useEffect(() => {callback.current = onEvent; state.current = {playing, position, positionAt, muted};}, [onEvent, playing, position, positionAt, muted]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow || !event.data?.ondaMedia) return;
      const message = event.data.ondaMedia as MediaEvent;
      if (message.kind === 'ready') ref.current?.contentWindow?.postMessage({ondaPlayback: current()}, '*');
      callback.current(message);
    };
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(() => {ref.current?.contentWindow?.postMessage({ondaPlayback: current()}, '*');}, [playing, position, positionAt, muted]);
  return <iframe ref={ref} title={media.title} srcDoc={html} allow="autoplay; fullscreen; encrypted-media" sandbox="allow-scripts allow-same-origin allow-presentation" style={{width: '100%', minHeight: 190, height: theater ? 'min(55vh,480px)' : media.kind === 'audio' ? 210 : undefined, aspectRatio: !theater && media.kind !== 'audio' ? '16 / 9' : undefined, border: 0, borderRadius: 18}}/>;
}
