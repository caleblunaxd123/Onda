import { useEffect, useState } from 'react';
import { TextInput, View, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '../src/icons';
import { useStations } from '../src/catalog';
import { useTheme } from '../src/theme';
import { useLibrary } from '../src/library';
import { Page, Label, Button, StationRow, Loading, Message, SectionTitle } from '../src/ui';
const countries=[['US','🇺🇸','Estados Unidos'],['GB','🇬🇧','Reino Unido'],['DE','🇩🇪','Alemania'],['ES','🇪🇸','España'],['PE','🇵🇪','Perú'],['JP','🇯🇵','Japón']];
export default function Search() {
 const c=useTheme();const [text,setText]=useState('');const [query,setQuery]=useState('');const [offset,setOffset]=useState(0);
 const [country,setCountry]=useState('');const [tag,setTag]=useState('');const [language,setLanguage]=useState('');
 const searches=useLibrary(s=>s.searches);const remember=useLibrary(s=>s.rememberSearch);
 useEffect(()=>{const timer=setTimeout(()=>{setQuery(text.trim());setOffset(0);},350);return()=>clearTimeout(timer);},[text]);
 const result=useStations({q:query,country:country||undefined,tag,language,offset});
 return <Page><View style={{backgroundColor:c.surface,borderRadius:14,flexDirection:'row',alignItems:'center',paddingHorizontal:14,gap:8}}><Ionicons name="search" color={c.muted} size={18}/><TextInput accessibilityLabel="Nombre de emisora" placeholder="Encuentra lo que te gusta" placeholderTextColor={c.muted} value={text} onChangeText={setText} onSubmitEditing={()=>remember(text.trim())} style={{color:c.text,flex:1,paddingVertical:13,minHeight:50}}/>{!!text&&<Pressable accessibilityLabel="Limpiar búsqueda" accessibilityRole="button" onPress={()=>setText('')} style={{padding:8}}><Ionicons name="close-circle" size={20} color={c.muted}/></Pressable>}</View>
 <ScrollView horizontal contentContainerStyle={{gap:8}} showsHorizontalScrollIndicator={false}><Button title="Todo" secondary={!!(country||tag||language)} onPress={()=>{setCountry('');setTag('');setLanguage('');setOffset(0);}}/>{['spanish','english','japanese'].map((l,i)=><Button key={l} title={['Español','Inglés','Japonés'][i]} secondary={language!==l} onPress={()=>{setLanguage(language===l?'':l);setOffset(0);}}/>)}</ScrollView>
 {!text&&searches.length>0&&<><SectionTitle title="Búsquedas recientes"/><ScrollView horizontal contentContainerStyle={{gap:8}}>{searches.map(s=><Button key={s} title={s} secondary onPress={()=>setText(s)}/>)}</ScrollView></>}
 <SectionTitle title="Emisoras"/>
 {result.isPending?<Loading/>:result.isError?<Message title="No pudimos buscar" body={result.error.message} retry={()=>result.refetch()}/>:result.data.items.length===0?<Message title="Sin resultados" body="Prueba un nombre más corto o elimina algún filtro."/>:result.data.items.map(s=><StationRow key={s.id} station={s}/>)}
 <View style={{flexDirection:'row',gap:12}}>{offset>0&&<Button title="Anterior" secondary onPress={()=>setOffset(Math.max(0,offset-30))}/>}{(result.data?.items.length??0)>0&&offset<9960&&<Button title="Más emisoras" secondary onPress={()=>{remember(query);setOffset(offset+30);}}/>}</View>
 <SectionTitle title="Países"/><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:20}}>{countries.map(([code,flag,name])=><Pressable key={code} accessibilityRole="button" accessibilityState={{selected:country===code}} onPress={()=>{setCountry(country===code?'':code);setOffset(0);}} style={{width:76,alignItems:'center',gap:8}}><View style={{width:58,height:58,borderRadius:29,alignItems:'center',justifyContent:'center',backgroundColor:c.surface,borderWidth:2,borderColor:country===code?c.primary:'transparent'}}><Label style={{fontSize:30,lineHeight:40}}>{flag}</Label></View><Label style={{fontSize:11,lineHeight:16,textAlign:'center'}}>{name}</Label></Pressable>)}</ScrollView>
 <SectionTitle title="Géneros"/><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{['rock','salsa','jazz','classical','pop','news','80s','electronic'].map(g=><Button key={g} title={g} secondary={tag!==g} onPress={()=>{setTag(tag===g?'':g);setOffset(0);}}/>)}</View>
 </Page>;
}
