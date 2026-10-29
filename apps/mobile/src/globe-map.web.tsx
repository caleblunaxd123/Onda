import {forwardRef, useCallback, useEffect, useImperativeHandle, useRef} from 'react';
import html from './generated/globe-html';
import {receiveGlobe, type GlobeHandle, type GlobeProps} from './globe-types';
export const GlobeMap = forwardRef<GlobeHandle, GlobeProps>(function GlobeMap(props, ref) {
  const frame = useRef<HTMLIFrameElement>(null); const latest = useRef(props); latest.current = props;
  const send = useCallback((data: object) => frame.current?.contentWindow?.postMessage(data, window.location.origin), []);
  const sync = useCallback(() => send({type: 'features', features: latest.current.features, selectedId: latest.current.selectedId}), [send]);
  useImperativeHandle(ref, () => ({send}), [send]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {if (event.source !== frame.current?.contentWindow || event.origin !== window.location.origin || !event.data?.ondaGlobe) return; if (event.data.type === 'ready') sync(); receiveGlobe(event.data, latest.current);};
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, [sync]);
  useEffect(sync, [props.features, props.selectedId, sync]);
  return <iframe ref={frame} title="Globo terráqueo de emisoras" srcDoc={html} style={{border: 0, width: '100%', height: '100%', flex: 1, background: '#101B32'}}/>;
});
