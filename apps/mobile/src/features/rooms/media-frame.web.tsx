import {useEffect, useMemo, useRef} from 'react';
import {roomPlayerHtml} from './player-html';
import type {FrameProps, MediaEvent} from './media-frame';
export function MediaFrame({media, host, playing, position, muted, onEvent}: FrameProps) {
  const ref = useRef<HTMLIFrameElement>(null); const callback = useRef(onEvent);
  const descriptor = JSON.stringify(media);
  const html = useMemo(() => roomPlayerHtml(JSON.parse(descriptor), host, window.location.origin), [descriptor, host]);
  const state = useRef({playing, position, muted});
  useEffect(() => {callback.current = onEvent; state.current = {playing, position, muted};}, [onEvent, playing, position, muted]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow || !event.data?.ondaMedia) return;
      const message = event.data.ondaMedia as MediaEvent;
      if (message.kind === 'ready') ref.current?.contentWindow?.postMessage({ondaPlayback: state.current}, '*');
      callback.current(message);
    };
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(() => {ref.current?.contentWindow?.postMessage({ondaPlayback: {playing, position, muted}}, '*');}, [playing, position, muted]);
  return <iframe ref={ref} title={media.title} srcDoc={html} allow="autoplay; fullscreen; encrypted-media" sandbox="allow-scripts allow-same-origin allow-presentation" style={{width: '100%', height: media.kind === 'audio' ? 220 : 260, border: 0, borderRadius: 20}}/>;
}
