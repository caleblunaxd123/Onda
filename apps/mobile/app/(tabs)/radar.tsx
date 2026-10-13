import { useRef, useState } from 'react';
import { FlatList, Share, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '../../src/icons';
import { useStations } from '../../src/catalog';
import { player, usePlayer } from '../../src/player';
import { useTheme } from '../../src/theme';
import { Label, Heading, Artwork, Favorite, Loading, Message, IconButton } from '../../src/ui';
export default function Radar() {
 const c=useTheme();const result=useStations();const playback=usePlayer();const [height,setHeight]=useState(500);const enabled=useRef(false);
 return <View style={{flex:1,backgroundColor:c.bg}} onLayout={e=>setHeight(e.nativeEvent.layout.height)}>
 {result.isPending?<Loading/>:result.isError?<Message title="Radar sin señal" body={result.error.message} retry={()=>result.refetch()}/>:!result.data.items.length?<Message title="Sin emisoras disponibles" body="Intenta otra búsqueda."/>:<FlatList data={result.data.items} pagingEnabled keyExtractor={s=>s.id} showsVerticalScrollIndicator={false} onMomentumScrollEnd={e=>{const index=Math.round(e.nativeEvent.contentOffset.y/height);const s=result.data.items[index];if(s&&enabled.current)player.select(s);}} renderItem={({item,index})=>{
 const active=playback.station?.id===item.id&&['playing','connecting','buffering'].includes(playback.state);
 return <View style={{height,paddingHorizontal:24,paddingTop:22,paddingBottom:12,alignItems:'center',gap:14}}>
 <Label style={{fontSize:11,letterSpacing:3,color:c.muted}}>RADIO RADAR · {String(index+1).padStart(2,'0')}</Label>
 <View style={{alignSelf:'stretch',height:Math.min(245,height*.4),marginTop:15}}>
 <View style={{position:'absolute',left:24,right:24,top:-14,height:80,borderRadius:22,backgroundColor:c.accent+'38'}}/><View style={{position:'absolute',left:10,right:10,top:-7,height:80,borderRadius:22,backgroundColor:c.accent+'70'}}/>
 <View style={{flex:1,backgroundColor:c.surface,borderRadius:22,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:c.border}}><Artwork station={item} size={Math.min(190,height*.31)}/></View></View>
 <View style={{alignItems:'center',gap:4}}><View style={{backgroundColor:c.surface,borderRadius:8,paddingHorizontal:10,paddingVertical:2}}><Label style={{fontSize:11,fontWeight:'700',color:c.primary}}>{item.country.toUpperCase()}</Label></View><Heading>{item.name}</Heading><Label style={{fontSize:13,color:c.muted}}>{item.tags.slice(0,3).join(' · ')||item.language}</Label></View>
 <View style={{flexDirection:'row',alignItems:'center',gap:30}}><Favorite station={item}/><IconButton large icon={active?'pause':'play'} label={active?'Pausar':'Sintonizar '+item.name} onPress={()=>{enabled.current=true;if(active)player.toggle();else player.select(item);}}/><IconButton icon="share-social-outline" label="Compartir" onPress={()=>{void Share.share({message:item.name+' — '+item.streamUrl}).catch(()=>{});}}/></View>
 <View style={{alignItems:'center',gap:2}}><Label onPress={()=>{if(playback.station?.id!==item.id)player.select(item);router.push('/player');}} accessibilityRole="button" style={{fontSize:12,color:c.primary,padding:10}}>Información de la emisora</Label><Label style={{fontSize:11,color:c.muted}}>Desliza para la siguiente emisora</Label><Ionicons name="chevron-down" size={20} color={c.muted}/></View>
 </View>;
 }}/>}
 </View>;
}
