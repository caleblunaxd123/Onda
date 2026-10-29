import {forwardRef, useCallback, useEffect, useImperativeHandle, useRef} from 'react';
import {WebView} from 'react-native-webview';
import html from './generated/globe-html';
import {receiveGlobe, type GlobeHandle, type GlobeProps} from './globe-types';
export const GlobeMap = forwardRef<GlobeHandle, GlobeProps>(function GlobeMap(props, ref) {
  const view = useRef<WebView>(null); const ready = useRef(false); const latest = useRef(props); latest.current = props;
  const send = useCallback((data: object) => view.current?.injectJavaScript(`window.ondaMap?.receive(${JSON.stringify(data)});true;`), []);
  const sync = useCallback(() => send({type: 'features', features: latest.current.features, selectedId: latest.current.selectedId}), [send]);
  useImperativeHandle(ref, () => ({send}), [send]);
  useEffect(() => {if (ready.current) sync();}, [props.features, props.selectedId, sync]);
  return <WebView ref={view} style={{flex: 1, backgroundColor: '#101B32'}} source={{html, baseUrl: 'https://onda.lunalav.pe/'}}
    originWhitelist={['https://onda.lunalav.pe', 'about:blank']} javaScriptEnabled domStorageEnabled={false} allowFileAccess={false} mixedContentMode="never"
    setSupportMultipleWindows={false} allowsInlineMediaPlayback={false} mediaPlaybackRequiresUserAction
    onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url === 'https://onda.lunalav.pe/'}
    onMessage={event => {try {const data = JSON.parse(event.nativeEvent.data); if (data.type === 'ready') {ready.current = true; sync();} receiveGlobe(data, latest.current);} catch { /* Ignore malformed bridge messages. */ }}}
    onError={() => props.onError('No se pudo abrir el globo. Puedes usar la lista de emisoras.')}/>
});
