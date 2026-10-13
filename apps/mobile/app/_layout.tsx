import { useEffect, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { player, prepareAudio } from '../src/player';
import { useTheme } from '../src/theme';
import { Label } from '../src/ui';
const queryClient = new QueryClient();
export default function RootLayout() {
 const c=useTheme();const [error,setError]=useState('');
 useEffect(()=>{
   prepareAudio().catch(()=>setError('No se pudo configurar el audio. Reinicia la aplicación.'));
   const network=NetInfo.addEventListener(s=>{const connected=s.isConnected!==false&&s.isInternetReachable!==false;onlineManager.setOnline(connected);player.setOnline(connected);});
   const app=AppState.addEventListener('change',()=>player.checkSleep());
   return ()=>{network();app.remove();};
 },[]);
 return <GestureHandlerRootView style={{flex:1,backgroundColor:c.bg}}><View style={[{flex:1},Platform.OS==='web'&&{width:'100%',maxWidth:480,alignSelf:'center',borderLeftWidth:1,borderRightWidth:1,borderColor:c.border}]}><SafeAreaProvider><QueryClientProvider client={queryClient}><SafeAreaView edges={['top']} style={{flex:1,backgroundColor:c.bg}}>
 <StatusBar style={c.bg==='#0B1326'?'light':'dark'}/>{error?<View style={{padding:16}}><Label>{error}</Label></View>:null}
 <Stack screenOptions={{headerStyle:{backgroundColor:c.bg},headerTintColor:c.text,contentStyle:{backgroundColor:c.bg}}}>
 <Stack.Screen name="(tabs)" options={{headerShown:false}}/><Stack.Screen name="player" options={{title:'Ahora suena',presentation:'modal'}}/>
 <Stack.Screen name="search" options={{title:'Busca tu próxima frecuencia'}}/><Stack.Screen name="settings" options={{title:'Tu ONDA'}}/>
 </Stack></SafeAreaView></QueryClientProvider></SafeAreaProvider></View></GestureHandlerRootView>;
}
