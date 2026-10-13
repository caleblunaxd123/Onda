import { useEffect, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Map as BrowserMap, NavigationControl, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStations } from '../../src/catalog';
import { useTheme } from '../../src/theme';
import { Label, Button, StationRow, Loading, Message } from '../../src/ui';
import type { Station } from '../../src/types';

export default function WorldWeb() {
 const c=useTheme(); const [country,setCountry]=useState(''); const [selected,setSelected]=useState<Station|null>(null);
 const [error,setError]=useState(''); const catalog=useStations({country});
 const container=useRef<HTMLDivElement>(null); const map=useRef<BrowserMap|null>(null);
 const stations=useRef<Station[]>([]);
 useEffect(()=>{stations.current=catalog.data?.items??[];},[catalog.data]);
 useEffect(()=>{
  if(!container.current)return;
  setWorkerUrl('/vendor/maplibre-gl-worker.mjs');
  let instance:BrowserMap;
  try { instance=new BrowserMap({container:container.current,style:process.env.EXPO_PUBLIC_MAP_STYLE??'https://demotiles.maplibre.org/style.json',center:[0,15],zoom:1}); }
  // MapLibre can fail synchronously when the browser has no WebGL context.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  catch {setError('No se pudo iniciar el mapa en este navegador. Puedes explorar la lista.');return;}
  map.current=instance;
  instance.addControl(new NavigationControl(),'top-right');
  instance.on('load',()=>{
   instance.addSource('stations',{type:'geojson',data:features(stations.current),cluster:true,clusterRadius:50});
   instance.addLayer({id:'stations',type:'circle',source:'stations',paint:{'circle-color':'#29D3CF','circle-radius':['case',['has','point_count'],18,8],'circle-stroke-color':'#172644','circle-stroke-width':2}});
   instance.addLayer({id:'counts',type:'symbol',source:'stations',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-size':12},paint:{'text-color':'#0B1326'}});
  });
  instance.on('click','stations',async event=>{
   const feature=event.features?.[0]; if(!feature||feature.geometry.type!=='Point')return;
   if(feature.properties?.cluster){const zoom=await (instance.getSource('stations') as GeoJSONSource).getClusterExpansionZoom(Number(feature.properties.cluster_id));instance.easeTo({center:feature.geometry.coordinates as [number,number],zoom});}
   else setSelected(stations.current.find(s=>s.id===feature.properties?.id)??null);
  });
  instance.on('error',()=>setError('Algunas capas del mapa no se pudieron cargar. La lista sigue disponible.'));
  const observer=new ResizeObserver(()=>instance.resize());observer.observe(container.current);
  return ()=>{observer.disconnect();instance.remove();map.current=null;};
 },[]);
 useEffect(()=>{(map.current?.getSource('stations') as GeoJSONSource|undefined)?.setData(features(catalog.data?.items??[]));},[catalog.data]);
 return <View style={{flex:1,backgroundColor:c.bg}}><View style={{padding:16,gap:12}}><Label style={{fontSize:26,fontWeight:'800'}}>El mundo, en directo.</Label><ScrollView horizontal contentContainerStyle={{gap:8}}>{[['','Mundo'],['PE','Perú'],['JP','Japón'],['US','EE. UU.'],['ES','España'],['BR','Brasil']].map(([code,name])=><Button key={code} title={name} secondary={country!==code} onPress={()=>{setCountry(code);setSelected(null);}}/>)}</ScrollView></View>
 <div ref={container} aria-label="Mapa de emisoras" style={{flex:1,minHeight:240,width:'100%'}}/>
 <View style={{backgroundColor:c.surface,padding:20,borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:250,gap:8}}><Label style={{fontWeight:'800'}}>{country||'El mundo'} · Emisoras</Label><Label style={{fontSize:11,lineHeight:16,color:c.muted}}>Coordenadas del catálogo; no representan transmisores verificados. Hasta 30 resultados.</Label>{!!error&&<Label style={{fontSize:12,color:c.live}}>{error}</Label>}
 {catalog.isPending?<Loading/>:catalog.isError?<Message title="Catálogo no disponible" body={catalog.error.message} retry={()=>catalog.refetch()}/>:selected?<StationRow station={selected}/>:<ScrollView>{catalog.data?.items.map(s=><StationRow key={s.id} station={s}/>)}</ScrollView>}</View></View>;
}
function features(stations:Station[]):GeoJSON.FeatureCollection<GeoJSON.Point> {
 return {type:'FeatureCollection',features:stations.filter(s=>s.latitude!==null&&s.longitude!==null).map(s=>({type:'Feature',id:s.id,properties:{id:s.id},geometry:{type:'Point',coordinates:[s.longitude!,s.latitude!]}}))};
}
