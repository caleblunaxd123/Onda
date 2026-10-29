import {Map, setWorkerUrl, setWorkerCount, type GeoJSONSource, type ExpressionSpecification} from 'maplibre-gl';
import {earthStyle} from '../src/earth-style';
import type {FeatureCollection, Point} from 'geojson';
declare const ONDA_MAP_WORKER: string;
declare global {interface Window {ReactNativeWebView?: {postMessage(data: string): void}; ondaMap: {receive(data: Message): void}}}
type Message = {type: 'features'; features: FeatureCollection<Point>; selectedId: string | null} | {type: 'fit'; bounds: [number, number, number, number]} | {type: 'focus'; center: [number, number]; zoom?: number} | {type: 'zoom'; delta: number} | {type: 'home'} | {type: 'mode'; value: 'earth' | 'streets'};
const empty: FeatureCollection<Point> = {type: 'FeatureCollection', features: []};
let features = empty; let selected = ''; let loaded = false;
const send = (message: object) => {if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message)); else window.parent.postMessage({ondaGlobe: true, ...message}, window.location.origin === 'null' ? '*' : window.location.origin);};
setWorkerCount(1);
setWorkerUrl(URL.createObjectURL(new Blob([ONDA_MAP_WORKER], {type: 'text/javascript'})));
const status = document.getElementById('status')!;
try {
  const overviewZoom = () => Math.max(0.5, 2 + Math.log2(Math.min(window.innerWidth, window.innerHeight) * 0.86 / 500));
  const map = new Map({container: 'map', style: earthStyle, center: [-74, -12], zoom: overviewZoom(), maxZoom: 14, minZoom: -0.3,
    attributionControl: {compact: true}, canvasContextAttributes: {antialias: true}, dragRotate: false, pitchWithRotate: false});
  const report = () => {const b = map.getBounds(); send({type: 'viewport', bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: map.getZoom()});};
  map.on('style.load', () => {
    map.setProjection({type: 'globe'});
    // Keep names in Spanish in the street view too, retaining the provider's fallback expressions.
    for (const layer of map.getStyle().layers) {
      if (layer.type === 'symbol' && layer.layout?.['text-field'] && layer.id.startsWith('label_')) {
        const field = layer.layout['text-field'];
        if (Array.isArray(field) && JSON.stringify(field).includes('name')) map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:es'], field as ExpressionSpecification]);
      }
    }
    map.addSource('stations', {type: 'geojson', data: features});
    map.addLayer({id: 'radio-glow', type: 'circle', source: 'stations', paint: {'circle-color': '#25EAB1', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 6, 7], 'circle-opacity': 0.18, 'circle-blur': 0.6}});
    map.addLayer({id: 'radio-points', type: 'circle', source: 'stations', paint: {'circle-color': '#34F0BB', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 1.8, 6, 3.3, 12, 4], 'circle-stroke-width': 0.5, 'circle-stroke-color': '#D3FFF0'}});
    map.addLayer({id: 'radio-selected', type: 'circle', source: 'stations', filter: ['==', ['get', 'stationId'], selected || '-'], paint: {'circle-color': '#FFFFFF', 'circle-opacity': 0.14, 'circle-radius': 16, 'circle-stroke-width': 1.6, 'circle-stroke-color': '#FFFFFF'}});
    loaded = true; status.hidden = true; report(); send({type: 'ready'});
  });
  map.on('moveend', report);
  // Small visible dots retain a comfortable touch target. The closest actual dot wins.
  map.on('click', event => {
    const p = event.point;
    const hits = map.queryRenderedFeatures([[p.x - 22, p.y - 22], [p.x + 22, p.y + 22]], {layers: ['radio-points']});
    const hit = hits.filter(f => f.geometry.type === 'Point').sort((a, b) => {
      const distance = (f: typeof a) => {const xy = map.project((f.geometry as Point).coordinates as [number, number]); return (xy.x - p.x) ** 2 + (xy.y - p.y) ** 2;};
      return distance(a) - distance(b);
    })[0];
    if (!hit || hit.geometry.type !== 'Point') return;
    if (hit.properties.stationId) send({type: 'select', id: hit.properties.stationId});
    else {map.easeTo({center: hit.geometry.coordinates as [number, number], zoom: Math.min(map.getZoom() + 2, 14), duration: 700}); send({type: 'group'});}
  });
  map.on('mouseenter', 'radio-points', () => {map.getCanvas().style.cursor = 'pointer';});
  map.on('mouseleave', 'radio-points', () => {map.getCanvas().style.cursor = '';});
  let notified = false;
  map.on('error', () => {if (!notified) {notified = true; send({type: 'error', message: 'No se pudieron cargar algunas imágenes. Prueba la vista Mapa o la lista de emisoras.'});}});
  window.ondaMap = {receive(data) {
    if (!data || typeof data !== 'object') return;
    if (data.type === 'features') {
      features = data.features; selected = data.selectedId ?? '';
      if (loaded) {(map.getSource('stations') as GeoJSONSource | undefined)?.setData(features); if (map.getLayer('radio-selected')) map.setFilter('radio-selected', ['==', ['get', 'stationId'], selected || '-']);}
    } else if (data.type === 'fit') map.fitBounds([[data.bounds[0], data.bounds[1]], [data.bounds[2], data.bounds[3]]], {padding: 45, maxZoom: 7, duration: 900});
    else if (data.type === 'focus') map.flyTo({center: data.center, zoom: data.zoom ?? map.getZoom(), duration: 800});
    else if (data.type === 'zoom') map.zoomTo(Math.min(14, Math.max(-0.3, map.getZoom() + data.delta)), {duration: 350});
    else if (data.type === 'home') map.flyTo({center: map.getCenter(), zoom: overviewZoom(), bearing: 0, pitch: 0, duration: 900});
    else if (data.type === 'mode') {loaded = false; notified = false; map.setStyle(data.value === 'earth' ? earthStyle : 'https://tiles.openfreemap.org/styles/liberty');}
  }};
  window.addEventListener('message', event => {if (event.source === window.parent && event.origin === window.parent.location.origin) window.ondaMap.receive(event.data);});
  new ResizeObserver(() => map.resize()).observe(document.getElementById('map')!);
} catch {status.textContent = 'Tu dispositivo no pudo iniciar el globo. Usa la lista de emisoras.'; send({type: 'error', message: status.textContent});}
