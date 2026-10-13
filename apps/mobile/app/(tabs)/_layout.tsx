import { Pressable, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '../../src/icons';
import { useTheme } from '../../src/theme';
import { Label, MiniPlayer } from '../../src/ui';
const items = {index:{icon:'home-outline',title:'Inicio'},world:{icon:'earth-outline',title:'Mundo'},radar:{icon:'compass-outline',title:'Radar'},rooms:{icon:'people-outline',title:'Salas'},library:{icon:'albums-outline',title:'Biblioteca'}} as const;
export default function TabLayout() {
 const c=useTheme();
 return <Tabs screenOptions={{headerShown:false}} tabBar={({state,navigation,insets})=><View style={{backgroundColor:c.bg,paddingBottom:insets.bottom}}><MiniPlayer/><View style={{flexDirection:'row',borderTopWidth:1,borderTopColor:c.border,paddingTop:8}}>
 {state.routes.map((route,index)=>{
 const item=items[route.name as keyof typeof items];const focused=state.index===index;
 return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={item.title} accessibilityState={{selected:focused}} onPress={()=>{const e=navigation.emit({type:'tabPress',target:route.key,canPreventDefault:true});if(!e.defaultPrevented)navigation.navigate(route.name);}} onLongPress={()=>navigation.emit({type:'tabLongPress',target:route.key})} style={{flex:1,minHeight:56,alignItems:'center',gap:4}}><Ionicons name={item.icon} size={22} color={focused?c.primary:c.muted}/><Label style={{fontSize:10,lineHeight:15,color:focused?c.primary:c.muted,fontWeight:focused?'700':'400'}}>{item.title}</Label></Pressable>;
 })}
 </View></View>}>
 <Tabs.Screen name="index"/><Tabs.Screen name="world"/><Tabs.Screen name="radar"/><Tabs.Screen name="rooms"/><Tabs.Screen name="library"/>
 </Tabs>;
}
