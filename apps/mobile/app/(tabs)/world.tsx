import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Map, Camera, GeoJSONSource, Layer, type CameraRef } from '@maplibre/maplibre-react-native';
import { useTheme } from '../../src/theme';
import { BrandHeader, IconButton } from '../../src/ui';
import { router } from 'expo-router';
import { MapCountBadge, WorldPanel, clusterColor, clusterRadius, useWorldExplorer, type Bounds } from '../../src/world';
import { useMapStyle } from '../../src/map-style';

function MapButton(props: React.ComponentProps<typeof IconButton>) {
  return <View style={{borderRadius: 24, boxShadow: '0px 4px 12px rgba(15, 26, 53, 0.18)'}}><IconButton {...props}/></View>;
}

export default function World() {
  const c = useTheme(); const explorer = useWorldExplorer();
  const camera = useRef<CameraRef>(null);
  const centered = useRef(false);
  const style = useMapStyle(c.isDark);
  const [loaded, setLoaded] = useState(false);
  const fit = (bounds: Bounds | null) => {if (bounds) camera.current?.fitBounds(bounds, {padding: {top: 40, right: 40, bottom: 60, left: 40}, duration: 900});};
  // Start on the preferred country (from settings, never GPS) once the map is ready and the catalog bounds are known.
  useEffect(() => {
    if (centered.current || !loaded || !explorer.countries.data) return;
    centered.current = true;
    const bounds = explorer.countries.data.find(x => x.code === explorer.preferred)?.bounds ?? null;
    const timer = setTimeout(() => fit(bounds), 300);
    return () => clearTimeout(timer);
  }, [loaded, explorer.countries.data, explorer.preferred]);
  return <View style={{flex: 1, backgroundColor: c.bg}}>
    <BrandHeader title="Explorar el mundo" emoji="🌍" subtitle="Toca un grupo para acercarte o una emisora para oírla.">
      <IconButton icon="settings-outline" label="Ajustes" onPress={() => router.push('/settings')}/>
    </BrandHeader>
    <View style={{flex: 1, minHeight: 220}}>
      {!style ? <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceAlt}}><ActivityIndicator color={c.primary} accessibilityLabel="Cargando mapa"/></View> :
      <Map style={{flex: 1}} mapStyle={style as never} attributionPosition={{bottom: 30, right: 8}} logo={false}
        onDidFinishLoadingMap={() => setLoaded(true)}
        onRegionDidChange={event => explorer.onViewport(event.nativeEvent.bounds as Bounds, event.nativeEvent.zoom)}>
        <Camera ref={camera} initialViewState={{center: [-30, 10], zoom: 1}}/>
        <GeoJSONSource id="stations" data={explorer.features} onPress={event => {
          const feature = event.nativeEvent.features[0];
          if (!feature || feature.geometry.type !== 'Point') return;
          const [lon, lat] = feature.geometry.coordinates as [number, number];
          const id = feature.properties?.stationId as string | undefined;
          if (id) explorer.select(id);
          else camera.current?.easeTo({center: [lon, lat], zoom: Math.min(explorer.zoom.current + 2.5, 14), duration: 600});
        }}>
          <Layer id="clusters" type="circle" filter={['>', ['get', 'count'], 1]} paint={{'circle-color': clusterColor as never, 'circle-radius': clusterRadius as never, 'circle-opacity': 0.92, 'circle-stroke-width': 3, 'circle-stroke-color': '#FFFFFF'}}/>
          <Layer id="cluster-count" type="symbol" filter={['>', ['get', 'count'], 1]} layout={{'text-field': ['get', 'label'], 'text-size': 12, 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true}} paint={{'text-color': '#FFFFFF'}}/>
          <Layer id="points" type="circle" filter={['==', ['get', 'count'], 1]} paint={{'circle-color': c.primary, 'circle-radius': 7, 'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF'}}/>
          <Layer id="selected" type="circle" filter={['==', ['get', 'stationId'], explorer.selectedId ?? '-']} paint={{'circle-color': c.live, 'circle-radius': 11, 'circle-stroke-width': 3, 'circle-stroke-color': '#FFFFFF'}}/>
        </GeoJSONSource>
      </Map>}
      <View style={{position: 'absolute', right: 12, top: 12, gap: 10}}>
        <MapButton icon="globe-outline" label="Ver todo el mundo" onPress={() => camera.current?.flyTo({center: [-30, 10], zoom: 1, duration: 800})}/>
        <MapButton icon="add" label="Acercar" onPress={() => camera.current?.zoomTo(Math.min(explorer.zoom.current + 1, 16), {duration: 300})}/>
        <MapButton icon="remove" label="Alejar" onPress={() => camera.current?.zoomTo(Math.max(explorer.zoom.current - 1, 0), {duration: 300})}/>
        <MapButton icon="navigate" label="Centrar en mi país (sin GPS)" onPress={() => fit(explorer.countries.data?.find(x => x.code === explorer.preferred)?.bounds ?? null)}/>
      </View>
      <MapCountBadge explorer={explorer}/>
    </View>
    <View style={{flex: 1.15}}>
      <WorldPanel explorer={explorer}
        onFocusStation={s => {if (s.latitude !== null && s.longitude !== null) camera.current?.flyTo({center: [s.longitude, s.latitude], zoom: Math.max(explorer.zoom.current, 7), duration: 800});}}
        onFocusCountry={fit}
        onFocusPlace={(lat, lon) => camera.current?.flyTo({center: [lon, lat], zoom: 8, duration: 800})}
        onReset={() => camera.current?.flyTo({center: [-30, 10], zoom: 1, duration: 800})}/>
    </View>
  </View>;
}
