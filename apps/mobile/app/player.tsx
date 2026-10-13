import { Share, View } from 'react-native';
import { useStations } from '../src/catalog';
import { player, usePlayer } from '../src/player';
import { useTheme } from '../src/theme';
import { Page, Heading, Label, Artwork, Button, Favorite, Card, StationRow, stateLabels, IconButton, SectionTitle, SaveToCollection } from '../src/ui';
export default function FullPlayer() {
 const c=useTheme();const state=usePlayer();const similar=useStations({tag:state.station?.tags[0]});
 if(!state.station)return <Page><Heading>Tu mundo, en directo</Heading><Label>Elige una emisora para comenzar.</Label></Page>;
 const station=state.station;const active=['playing','connecting','buffering'].includes(state.state);
 return <Page><View style={{alignItems:'center',gap:18,paddingVertical:14}}>
 <Label style={{color:c.muted,fontSize:11,letterSpacing:3}}>ESTÁS ESCUCHANDO</Label>
 <View style={{padding:7,borderWidth:1,borderColor:c.border,borderRadius:150}}><View style={{borderRadius:125,overflow:'hidden'}}><Artwork key={station.id} station={station} size={220}/></View></View>
 <View style={{backgroundColor:state.state==='playing'?c.live:c.surface,paddingHorizontal:12,paddingVertical:3,borderRadius:8}}><Label accessibilityLiveRegion="polite" style={{fontSize:11,fontWeight:'700',color:state.state==='playing'?c.bg:c.muted}}>{stateLabels[state.state]}</Label></View>
 <View style={{alignItems:'center',gap:4}}><Heading>{station.name}</Heading><Label style={{color:c.muted,fontSize:14}}>{station.country} · {station.language}</Label><Label style={{color:c.muted,fontSize:12}}>{station.tags.slice(0,3).join(' · ')}</Label></View>
 <View style={{flexDirection:'row',justifyContent:'center',gap:30,alignItems:'center'}}><Favorite station={station}/><IconButton large icon={active?'pause':'play'} label={active?'Pausar transmisión':'Reproducir transmisión'} onPress={player.toggle}/><IconButton icon="share-social-outline" label="Compartir emisora" onPress={()=>{void Share.share({message:station.name+' — '+station.streamUrl}).catch(()=>{});}}/></View>
 {state.error&&<Label style={{color:c.live,textAlign:'center',fontSize:13}}>{state.error}</Label>}
 </View>
 <Card><View style={{flexDirection:'row',justifyContent:'space-around'}}><View style={{alignItems:'center',gap:5}}><Label style={{color:c.primary}}>◷</Label><Label style={{fontSize:12}}>Temporizador</Label><Label style={{fontSize:11,color:c.muted}}>{state.sleepAt?new Date(state.sleepAt).toLocaleTimeString():'Desactivado'}</Label></View><View style={{alignItems:'center',gap:5}}><Label style={{color:c.primary}}>◈</Label><Label style={{fontSize:12}}>Calidad de origen</Label><Label style={{fontSize:11,color:c.muted}}>{station.codec||'No informada'} {station.bitrate>0?station.bitrate+' kbps':''}</Label></View></View>
 <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{[15,30,60,0].map(m=><Button key={m} title={m?m+' min':'Apagar timer'} secondary onPress={()=>player.setSleep(m)}/>)}</View></Card>
 <Card><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Label style={{fontWeight:'800'}}>Guardar en una colección</Label><SaveToCollection station={station}/></View><Label style={{fontSize:13,color:c.muted}}>Organiza esta frecuencia para volver a escucharla cuando quieras.</Label></Card>
 <Card><Label style={{fontWeight:'800'}}>Sobre la emisora</Label><Label style={{fontSize:14,color:c.muted}}>Desde {station.country||'el mundo'}, una transmisión de radio en directo. No hay información fiable de la canción actual disponible.</Label></Card>
 <SectionTitle title="En una frecuencia similar"/>{similar.data?.items.filter(s=>s.id!==station.id).slice(0,4).map(s=><StationRow key={s.id} station={s}/>)}
 </Page>;
}
