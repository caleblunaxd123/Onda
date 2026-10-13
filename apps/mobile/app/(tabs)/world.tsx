import { useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Map, Camera, GeoJSONSource, Layer, type CameraRef, type GeoJSONSourceRef } from '@maplibre/maplibre-react-native';
import type { FeatureCollection, Point } from 'geojson';
import { useStations } from '../../src/catalog';
import { useTheme } from '../../src/theme';
import { Label, Button, StationRow, Loading, Message } from '../../src/ui';
import type { Station } from '../../src/types';
export default function World() {
 const c=useTheme();const [country,setCountry]=useState('');const [selected,setSelected]=useState<Station|null>(null);
 const catalog=useStations({country});const camera=useRef<CameraRef>(null);const source=useRef<GeoJSONSourceRef>(null);
 const points:FeatureCollection<Point>={type:'FeatureCollection',features:(catalog.data?.items??[]).filter(s=>s.latitude!==null&&s.longitude!==null).map(s=>({type:'Feature',id:s.id,properties:{id:s.id},geometry:{type:'Point',coordinates:[s.longitude!,s.latitude!]}}))};
 return <View style={{flex:1,backgroundColor:c.bg}}>
 <View style={{padding:16,gap:12}}><Label style={{fontSize:28,fontWeight:'800'}}>El mundo, en directo.</Label><ScrollView horizontal contentContainerStyle={{gap:8}}>{[['','Mundo'],['PE','Perú'],['JP','Japón'],['US','EE. UU.'],['ES','España'],['BR','Brasil']].map(([code,name])=><Button key={code} title={name} secondary={country!==code} onPress={()=>{setCountry(code);setSelected(null);}}/>)}</ScrollView></View>
 <Map style={{flex:1,minHeight:240}} mapStyle={process.env.EXPO_PUBLIC_MAP_STYLE??'https://demotiles.maplibre.org/style.json'}>
 <Camera ref={camera} initialViewState={{center:[0,15],zoom:1}}/>
 <GeoJSONSource ref={source} id="stations" data={points} cluster clusterRadius={50} onPress={async e=>{
 const feature=e.nativeEvent.features[0];if(!feature)return;
 if(feature.properties?.cluster){const zoom=await source.current?.getClusterExpansionZoom(Number(feature.properties.cluster_id));if(feature.geometry.type==='Point')camera.current?.flyTo({center:feature.geometry.coordinates as [number,number],zoom:zoom??5});}
 else {const station=catalog.data?.items.find(s=>s.id===feature.properties?.id);if(station)setSelected(station);}
 }}>
 <Layer id="station-points" type="circle" paint={{'circle-color':c.primary,'circle-radius':['case',['has','point_count'],18,8],'circle-stroke-width':2,'circle-stroke-color':c.bg}}/>
 <Layer id="cluster-count" type="symbol" filter={['has','point_count']} layout={{'text-field':['get','point_count_abbreviated'],'text-size':12}} paint={{'text-color':c.bg}}/>
 </GeoJSONSource></Map>
 <View style={{padding:20,gap:8,maxHeight:240,backgroundColor:c.surface,borderTopLeftRadius:28,borderTopRightRadius:28,marginTop:-20}}><View style={{alignSelf:'center',width:36,height:4,borderRadius:4,backgroundColor:c.border}}/><Label style={{fontWeight:'800'}}>{country||'El mundo'} · Emisoras para descubrir</Label><Label style={{fontSize:11,lineHeight:16,color:c.muted}}>Coordenadas de Radio Browser, no transmisores verificados. Hasta 30 resultados por país.</Label>
 {catalog.isPending?<Loading/>:catalog.isError?<Message title="Mapa sin emisoras" body={catalog.error.message} retry={()=>catalog.refetch()}/>:selected?<StationRow station={selected}/>:<ScrollView>{catalog.data?.items.slice(0,8).map(s=><StationRow key={s.id} station={s}/>)}</ScrollView>}
 </View></View>;
}
