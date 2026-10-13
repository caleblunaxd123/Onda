import { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '../../src/icons';
import { useStations } from '../../src/catalog';
import { useLibrary } from '../../src/library';
import { useTheme } from '../../src/theme';
import { player } from '../../src/player';
import { Page, Label, Heading, StationRow, Artwork, Loading, Message, SectionTitle, StationTile, IconButton } from '../../src/ui';
const moods = [
 {name:'Relajarme',tag:'chillout',icon:'leaf-outline',color:'#35BD87'},
 {name:'Concentrarme',tag:'ambient',icon:'headset-outline',color:'#8769F6'},
 {name:'Energía',tag:'dance',icon:'flash-outline',color:'#EEA331'},
 {name:'Romántico',tag:'romantic',icon:'heart-outline',color:'#F16B9B'},
 {name:'Nostalgia',tag:'80s',icon:'disc-outline',color:'#35B7CC'},
 {name:'Noticias',tag:'news',icon:'newspaper-outline',color:'#9480EA'},
 {name:'Deportes',tag:'sports',icon:'football-outline',color:'#68BE54'},
 {name:'Descubrir',tag:'world',icon:'planet-outline',color:'#39AEEF'},
] as const;
export default function Home() {
 const c=useTheme();const country=useLibrary(s=>s.country);const history=useLibrary(s=>s.history);const [tag,setTag]=useState('');const [featuredIndex,setFeaturedIndex]=useState(0);
 const stations=useStations({country,tag});const international=useStations({tag:'jazz'});const featuredStations=stations.data?.items.slice(0,4)??[];const currentIndex=featuredIndex%Math.max(1,featuredStations.length);const featured=featuredStations[currentIndex];
 const hour=new Date().getHours();const greeting=hour<12?'Buen día':hour<19?'Buenas tardes':'Buenas noches';
 return <Page>
 <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Label style={{fontSize:29,fontWeight:'900',letterSpacing:1,color:c.primary}}>ONDA</Label><IconButton icon="person-circle-outline" label="Perfil y ajustes" onPress={()=>router.push('/settings')}/></View>
 <Pressable accessibilityRole="button" accessibilityLabel="Buscar emisoras, países y géneros" onPress={()=>router.push('/search')} style={{backgroundColor:c.surface,borderRadius:14,padding:13,flexDirection:'row',alignItems:'center',gap:8}}><Ionicons name="search" size={17} color={c.muted}/><Label style={{fontSize:13,color:c.muted}}>Buscar emisoras, países, géneros…</Label></Pressable>
 <View style={{gap:2}}><Label style={{fontSize:22,lineHeight:28,fontWeight:'800'}}>{greeting} <Label style={{color:c.primary}}>☀</Label></Label><Label style={{fontSize:13,color:c.muted}}>El mundo suena aquí.</Label></View>
 {stations.isPending?<Loading/>:stations.isError?<Message title="El catálogo no está disponible" body={stations.error.message} retry={()=>stations.refetch()}/>:featured?
 <Pressable accessibilityRole="button" accessibilityLabel={'Escuchar '+featured.name} onPress={()=>player.select(featured)} style={{backgroundColor:'#142142',borderRadius:24,padding:22,minHeight:182,overflow:'hidden'}}>
 <View pointerEvents="none" style={{position:'absolute',height:220,width:220,borderRadius:110,right:-75,top:-80,backgroundColor:'#453977'}}/><View pointerEvents="none" style={{position:'absolute',height:120,width:120,borderRadius:60,left:-40,bottom:-55,backgroundColor:'#763357'}}/>
 <View style={{flexDirection:'row',alignItems:'center',gap:18}}><Artwork key={featured.id} station={featured} size={96}/><View style={{flex:1,gap:6}}><Label style={{fontSize:10,lineHeight:16,color:'#BDB6EE',fontWeight:'700',letterSpacing:1}}>RADIO DESTACADA</Label><Label numberOfLines={2} style={{fontSize:23,lineHeight:28,fontWeight:'800',color:'#F5F8FF'}}>{featured.name}</Label><Label style={{fontSize:12,lineHeight:18,color:'#CFD9ED'}}>{featured.country} · {featured.tags.slice(0,2).join(' / ')||featured.codec}</Label></View></View>
 <View style={{marginTop:16,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><View style={{backgroundColor:'#FF667C',paddingVertical:3,paddingHorizontal:9,borderRadius:7}}><Label style={{fontSize:10,lineHeight:16,color:'#0B1326',fontWeight:'800'}}>● RADIO EN DIRECTO</Label></View><View style={{backgroundColor:'#F5F8FF',padding:9,borderRadius:99}}><Ionicons name="play" size={19} color="#142142"/></View></View>
 </Pressable>:<Message title="Prueba otra frecuencia" body="No hay emisoras compatibles. Elige otro ánimo o país."/>}
 {featuredStations.length>1&&<View style={{flexDirection:'row',justifyContent:'center',marginTop:-20,marginBottom:-12}}>{featuredStations.map((station,index)=><Pressable key={station.id} accessibilityRole="button" accessibilityLabel={'Destacar '+station.name} accessibilityState={{selected:currentIndex===index}} onPress={()=>setFeaturedIndex(index)} style={{minWidth:36,minHeight:44,alignItems:'center',justifyContent:'center'}}><View style={{height:6,width:currentIndex===index?18:6,borderRadius:99,backgroundColor:currentIndex===index?c.primary:c.border}}/></Pressable>)}</View>}
 {history.length>0&&<><SectionTitle title="Continuar escuchando" action="Ver todo" onPress={()=>router.push('/library')}/><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12}}>{history.slice(0,8).map(s=><StationTile key={s.id} station={s}/>)}</ScrollView></>}
 <SectionTitle title="Explorar por estado de ánimo"/>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{moods.map(m=><Pressable key={m.tag} accessibilityRole="button" accessibilityState={{selected:tag===m.tag}} onPress={()=>{setTag(tag===m.tag?'':m.tag);setFeaturedIndex(0);}} style={{width:'23%',flexGrow:1,minHeight:76,borderRadius:14,backgroundColor:m.color+'18',alignItems:'center',justifyContent:'center',gap:7,borderWidth:1,borderColor:tag===m.tag?m.color:'transparent'}}><Ionicons name={m.icon} size={24} color={m.color}/><Label style={{fontSize:10,lineHeight:15,color:c.text}}>{m.name}</Label></Pressable>)}</View>
 <SectionTitle title={tag?'Para este momento':'Populares en '+country} action="Ver todo" onPress={()=>router.push('/search')}/>
 {stations.data?.items.slice(1,5).map(s=><StationRow key={s.id} station={s}/>)}
 <SectionTitle title="Jazz sin fronteras" action="Explorar" onPress={()=>router.push('/world')}/>
 {international.data?.items.length?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12}}>{international.data.items.slice(0,8).map(s=><StationTile key={s.id} station={s}/>)}</ScrollView>:<Label style={{fontSize:13,color:c.muted}}>Las recomendaciones internacionales aparecerán cuando haya conexión al catálogo.</Label>}
 <Pressable accessibilityRole="button" onPress={()=>router.push('/world')} style={{backgroundColor:c.surface,padding:20,borderRadius:20,gap:8}}><Ionicons name="earth-outline" color={c.primary} size={30}/><Heading>Un mundo por escuchar.</Heading><Label style={{fontSize:13,color:c.muted}}>Encuentra tu próxima emisora en el mapa →</Label></Pressable>
 </Page>;
}
