import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Map as BrowserMap, NavigationControl, setWorkerUrl, type GeoJSONSource, type MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '../../src/theme';
import { BrandHeader, IconButton, Muted } from '../../src/ui';
import { router } from 'expo-router';
import { MapCountBadge, WorldPanel, clusterColor, clusterRadius, useWorldExplorer, type Bounds } from '../../src/world';
import { useMapStyle } from '../../src/map-style';

export default function WorldWeb() {
  const c = useTheme(); const explorer = useWorldExplorer();
  const [error, setError] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<BrowserMap | null>(null);
  const latest = useRef(explorer);
  useEffect(() => {latest.current = explorer;});
  const centered = useRef(false);
  const style = useMapStyle(c.isDark);
  const fit = (bounds: Bounds | null) => {if (bounds) map.current?.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], {padding: 40, duration: 900});};

  useEffect(() => {
    if (!container.current || !style) return;
    setWorkerUrl('/vendor/maplibre-gl-worker.mjs');
    let instance: BrowserMap;
    try {instance = new BrowserMap({container: container.current, style, center: [-30, 10], zoom: 1, attributionControl: {compact: true}});}
    // MapLibre can fail synchronously when the browser has no WebGL context.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    catch {setError('No se pudo iniciar el mapa en este navegador. Puedes explorar con la lista.'); return;}
    map.current = instance;
    instance.addControl(new NavigationControl({showCompass: false}), 'top-right');
    const report = () => {
      const b = instance.getBounds();
      latest.current.onViewport([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], instance.getZoom());
    };
    instance.on('load', () => {
      instance.addSource('stations', {type: 'geojson', data: latest.current.features});
      instance.addLayer({id: 'clusters', type: 'circle', source: 'stations', filter: ['>', ['get', 'count'], 1], paint: {'circle-color': clusterColor as never, 'circle-radius': clusterRadius as never, 'circle-opacity': 0.92, 'circle-stroke-width': 3, 'circle-stroke-color': '#FFFFFF'}});
      instance.addLayer({id: 'cluster-count', type: 'symbol', source: 'stations', filter: ['>', ['get', 'count'], 1], layout: {'text-field': ['get', 'label'], 'text-size': 12, 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true}, paint: {'text-color': '#FFFFFF'}});
      instance.addLayer({id: 'points', type: 'circle', source: 'stations', filter: ['==', ['get', 'count'], 1], paint: {'circle-color': '#0E9AA8', 'circle-radius': 7, 'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF'}});
      instance.addLayer({id: 'selected', type: 'circle', source: 'stations', filter: ['==', ['get', 'stationId'], '-'], paint: {'circle-color': '#E5384F', 'circle-radius': 11, 'circle-stroke-width': 3, 'circle-stroke-color': '#FFFFFF'}});
      report();
      const {countries, preferred} = latest.current;
      const bounds = countries.data?.find(x => x.code === preferred)?.bounds;
      if (!centered.current && bounds) {centered.current = true; instance.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], {padding: 40, duration: 900});}
    });
    instance.on('moveend', report);
    const onPoint = (event: MapMouseEvent & {features?: GeoJSON.Feature[]}) => {
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== 'Point') return;
      const id = feature.properties?.stationId as string | undefined;
      if (id) latest.current.select(id);
      else instance.easeTo({center: feature.geometry.coordinates as [number, number], zoom: Math.min(instance.getZoom() + 2.5, 14)});
    };
    for (const layer of ['clusters', 'points']) {
      instance.on('click', layer, onPoint);
      instance.on('mouseenter', layer, () => {instance.getCanvas().style.cursor = 'pointer';});
      instance.on('mouseleave', layer, () => {instance.getCanvas().style.cursor = '';});
    }
    instance.on('error', () => setError('Algunas capas del mapa no se pudieron cargar. La lista sigue disponible.'));
    const observer = new ResizeObserver(() => instance.resize()); observer.observe(container.current);
    return () => {observer.disconnect(); instance.remove(); map.current = null;};
  }, [style]);

  useEffect(() => {(map.current?.getSource('stations') as GeoJSONSource | undefined)?.setData(explorer.features);}, [explorer.features]);
  useEffect(() => {if (map.current?.getLayer('selected')) map.current.setFilter('selected', ['==', ['get', 'stationId'], explorer.selectedId ?? '-']);}, [explorer.selectedId]);
  // Start on the preferred country (from settings or time zone, never GPS) once both the map and the bounds are ready.
  useEffect(() => {
    if (centered.current || !explorer.countries.data || !map.current?.loaded()) return;
    centered.current = true;
    fit(explorer.countries.data.find(x => x.code === explorer.preferred)?.bounds ?? null);
  }, [explorer.countries.data, explorer.preferred]);

  return <View style={{flex: 1, backgroundColor: c.bg}}>
    <BrandHeader title="Explorar el mundo" emoji="🌍" subtitle="Toca un grupo para acercarte o una emisora para oírla.">
      <IconButton icon="settings-outline" label="Ajustes" onPress={() => router.push('/settings')}/>
    </BrandHeader>
    <View style={{flex: 1, minHeight: 220}}>
      <div ref={container} aria-label="Mapa de emisoras" style={{position: 'absolute', inset: 0}}/>
      <View style={{position: 'absolute', right: 12, top: 110, gap: 10}}>
        <IconButton icon="globe-outline" label="Ver todo el mundo" onPress={() => map.current?.flyTo({center: [-30, 10], zoom: 1})}/>
        <IconButton icon="navigate" label="Centrar en mi país (sin GPS)" onPress={() => fit(explorer.countries.data?.find(x => x.code === explorer.preferred)?.bounds ?? null)}/>
      </View>
      <MapCountBadge explorer={explorer}/>
    </View>
    {!!error && <Muted style={{color: c.live, paddingHorizontal: 20, paddingTop: 4}}>{error}</Muted>}
    <View style={{flex: 1.15}}>
      <WorldPanel explorer={explorer}
        onFocusStation={s => {if (s.latitude !== null && s.longitude !== null) map.current?.flyTo({center: [s.longitude, s.latitude], zoom: Math.max(map.current.getZoom(), 7)});}}
        onFocusCountry={fit}
        onFocusPlace={(lat, lon) => map.current?.flyTo({center: [lon, lat], zoom: 8})}
        onReset={() => map.current?.flyTo({center: [-30, 10], zoom: 1})}/>
    </View>
  </View>;
}
