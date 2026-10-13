import { PropsWithChildren, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextProps, View } from 'react-native';
import { Ionicons } from './icons';
import { router } from 'expo-router';
import { useTheme } from './theme';
import { useLibrary } from './library';
import { player, usePlayer } from './player';
import type { Station } from './types';
export function Label({style, ...props}: TextProps) {const c = useTheme(); return <Text {...props} style={[{color:c.text,fontSize:16,lineHeight:24},style]}/>;}
export function Page({children}: PropsWithChildren) {const c = useTheme();return <ScrollView style={{flex:1,backgroundColor:c.bg}} contentContainerStyle={{padding:24,paddingBottom:36,gap:20}} keyboardShouldPersistTaps="handled">{children}</ScrollView>;}
export function Heading({children}: PropsWithChildren) {return <Label accessibilityRole="header" style={{fontSize:28,lineHeight:36,fontWeight:'800'}}>{children}</Label>;}
export function Button({title,onPress,secondary=false}: {title:string;onPress:()=>void;secondary?:boolean}) {const c=useTheme();return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed})=>({minHeight:48,paddingHorizontal:18,paddingVertical:12,borderRadius:16,backgroundColor:secondary?c.surface:c.primary,opacity:pressed?.65:1,justifyContent:'center'})}><Label style={{color:secondary?c.text:c.bg,fontWeight:'700',textAlign:'center'}}>{title}</Label></Pressable>;}
export function Card({children}: PropsWithChildren) {const c=useTheme();return <View style={{padding:20,borderRadius:24,backgroundColor:c.surface,gap:12}}>{children}</View>;}
export function Artwork({station,size=64}: {station:Station;size?:number}) {
 const c=useTheme();const [failed,setFailed]=useState(false);
 return <View style={{width:size,height:size,borderRadius:Math.min(24,size/4),backgroundColor:c.border,alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
 {station.artworkUrl&&!failed?<Image accessibilityLabel={'Logo de '+station.name} source={{uri:station.artworkUrl}} style={{width:size,height:size}} onError={()=>setFailed(true)}/>:<Ionicons name="radio" size={size*.45} color={c.primary}/>}</View>;
}
export function Favorite({station}: {station:Station}) {
 const c=useTheme();const favorites=useLibrary(s=>s.favorites);const toggle=useLibrary(s=>s.toggle);const selected=favorites.some(s=>s.id===station.id);
 return <Pressable accessibilityRole="button" accessibilityLabel={selected?'Quitar de favoritos':'Añadir a favoritos'} accessibilityState={{selected}} onPress={()=>toggle(station)} style={{padding:12,minHeight:48,minWidth:48}}><Ionicons name={selected?'heart':'heart-outline'} size={24} color={c.primary}/></Pressable>;
}
export function StationRow({station}: {station:Station}) {const c=useTheme();return <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
 <Pressable accessibilityRole="button" accessibilityLabel={'Escuchar '+station.name} onPress={()=>player.select(station)} style={{flex:1,flexDirection:'row',gap:12,alignItems:'center',paddingVertical:8}}>
 <Artwork key={station.id} station={station}/><View style={{flex:1}}><Label numberOfLines={2} style={{fontWeight:'700'}}>{station.name}</Label><Label style={{fontSize:13,color:c.muted}}>{station.country} · {station.tags[0]||station.codec||'Radio'}</Label></View></Pressable><Favorite station={station}/></View>;}
export function Loading() {const c=useTheme();return <View accessibilityLabel="Cargando emisoras" style={{padding:24,gap:16}}><ActivityIndicator color={c.primary}/>{[1,2,3].map(k=><View key={k} style={{height:64,borderRadius:16,backgroundColor:c.surface}}/>)}</View>;}
export function Message({title,body,retry}: {title:string;body:string;retry?:()=>void}) {return <Card><Label style={{fontSize:20,fontWeight:'700'}}>{title}</Label><Label>{body}</Label>{retry&&<Button title="Reintentar" onPress={retry}/>}</Card>;}
export function MiniPlayer() {
 const c=useTheme();const s=usePlayer();if(!s.station)return null;
 return <View style={{backgroundColor:c.surface,borderTopWidth:1,borderColor:c.border,padding:12,flexDirection:'row',alignItems:'center',gap:12}}>
 <Pressable onPress={()=>router.push('/player')} accessibilityRole="button" accessibilityLabel="Abrir reproductor" style={{flex:1,flexDirection:'row',gap:12,alignItems:'center'}}><Artwork key={s.station.id} station={s.station} size={44}/><View style={{flex:1}}><Label numberOfLines={1} style={{fontWeight:'700'}}>{s.station.name}</Label><Label numberOfLines={1} style={{fontSize:12,color:s.error?c.live:c.muted}}>{s.error??stateLabels[s.state]}</Label></View></Pressable>
 <Button title={['playing','connecting','buffering'].includes(s.state)?'Pausar':'Escuchar'} onPress={player.toggle}/></View>;
}
export const stateLabels = {idle:'Elige una emisora', connecting:'Conectando…',buffering:'Cargando audio…',playing:'EN VIVO',paused:'En pausa',error:'Sin reproducción'};

export function IconButton({icon,label,onPress,large=false}: {icon:React.ComponentProps<typeof Ionicons>['name'];label:string;onPress:()=>void;large?:boolean}) {
 const c=useTheme();return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({pressed})=>({width:large?72:48,height:large?72:48,borderRadius:99,backgroundColor:large?c.primary:c.surface,alignItems:'center',justifyContent:'center',opacity:pressed?.7:1})}><Ionicons name={icon} size={large?34:22} color={large?c.bg:c.text}/></Pressable>;
}
export function SectionTitle({title,action,onPress}: {title:string;action?:string;onPress?:()=>void}) {const c=useTheme();return <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}><Label accessibilityRole="header" style={{fontSize:19,fontWeight:'800',flex:1}}>{title}</Label>{action&&<Pressable accessibilityRole="button" onPress={onPress} style={{minHeight:44,justifyContent:'center'}}><Label style={{fontSize:13,color:c.primary}}>{action}</Label></Pressable>}</View>;}
export function StationTile({station}: {station:Station}) {const c=useTheme();return <Pressable accessibilityRole="button" accessibilityLabel={'Escuchar '+station.name} onPress={()=>player.select(station)} style={{width:112,gap:6}}><View><Artwork station={station} size={112}/><View style={{position:'absolute',bottom:7,right:7,backgroundColor:c.surface,borderRadius:99,padding:6}}><Ionicons name="play" size={15} color={c.primary}/></View></View><Label numberOfLines={1} style={{fontSize:13,lineHeight:18,fontWeight:'700'}}>{station.name}</Label><Label numberOfLines={1} style={{fontSize:11,lineHeight:16,color:c.muted}}>{station.country}</Label></Pressable>;}
