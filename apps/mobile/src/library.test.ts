import { beforeEach, expect, it, vi } from 'vitest';
import { uniqueBroadcasts, useLibrary } from './library';
import type { Station } from './types';
const storage = vi.hoisted(() => ({getItem:vi.fn(async (_key:string):Promise<string|null>=>null),setItem:vi.fn(async()=>{}),removeItem:vi.fn(async()=>{})}));
vi.mock('@react-native-async-storage/async-storage',()=>({default:storage}));
const station:Station={id:'a',name:'Fixture',country:'Peru',countryCode:'PE',language:'spanish',tags:[],streamUrl:'https://example.com/test',artworkUrl:null,codec:'MP3',bitrate:128,votes:0,latitude:null,longitude:null};
beforeEach(()=>{useLibrary.getState().clear();vi.clearAllMocks();});
it('restores the immersive identity on upgrade while retaining the existing radio library',async()=>{
 storage.getItem.mockResolvedValueOnce(JSON.stringify({state:{theme:'dark',favorites:[station],history:[],collections:[]},version:0}));
 await useLibrary.persist.rehydrate();
 expect(useLibrary.getState().theme).toBe('immersive');
 expect(useLibrary.getState().favorites[0].id).toBe(station.id);
});
it('keeps an explicit dark preference after the immersive migration has already run',async()=>{
 storage.getItem.mockResolvedValueOnce(JSON.stringify({state:{theme:'dark',visualVersion:1,favorites:[],history:[],collections:[]},version:0}));
 await useLibrary.persist.rehydrate();
 expect(useLibrary.getState().theme).toBe('dark');
});
it('keeps radio favorites and collections when upgrading from the social beta soft theme',async()=>{
 storage.getItem.mockResolvedValueOnce(JSON.stringify({state:{theme:'soft',favorites:[station],history:[],collections:[{id:'saved',name:'Viajes',stations:[station]}]},version:0}));
 await useLibrary.persist.rehydrate();
 expect(useLibrary.getState().theme).toBe('light');
 expect(useLibrary.getState().favorites[0].id).toBe(station.id);
 expect(useLibrary.getState().collections[0].name).toBe('Viajes');
});
it('toggles favorites without duplicates and persists locally',()=>{
 useLibrary.getState().toggle(station);expect(useLibrary.getState().favorites).toHaveLength(1);
 expect(storage.setItem).toHaveBeenCalled();
 useLibrary.getState().toggle(station);expect(useLibrary.getState().favorites).toHaveLength(0);
});
it('deduplicates history and retains most recent station first',()=>{
 useLibrary.getState().remember(station);useLibrary.getState().remember({...station,id:'b',name:'B',streamUrl:'https://example.com/b'});useLibrary.getState().remember(station);
 expect(useLibrary.getState().history.map(s=>s.id)).toEqual(['a','b']);
});
it('rehydrates favorites from device storage',async()=>{
 storage.getItem.mockResolvedValueOnce(JSON.stringify({state:{favorites:[station],history:[],searches:[],country:'PE',theme:'dark'},version:0}));
 await useLibrary.persist.rehydrate();expect(useLibrary.getState().favorites[0].id).toBe('a');
});
it('creates normalized names, rejects blank names, and renames collections',()=>{
 expect(useLibrary.getState().createCollection('   ')).toBeNull();
 const id=useLibrary.getState().createCollection('  Jazz   de noche  ')!;
 expect(useLibrary.getState().collections[0].name).toBe('Jazz de noche');
 expect(useLibrary.getState().renameCollection(id,'')).toBe(false);
 expect(useLibrary.getState().collections[0].name).toBe('Jazz de noche');
 useLibrary.getState().renameCollection(id,'Viajes');
 expect(useLibrary.getState().collections[0].name).toBe('Viajes');
});
it('deduplicates stations inside a collection and keeps collections independent',()=>{
 const first=useLibrary.getState().createCollection('Uno')!;
 const second=useLibrary.getState().createCollection('Dos')!;
 useLibrary.getState().addToCollection(first,station);
 useLibrary.getState().addToCollection(first,{...station,name:'Actualizada'});
 useLibrary.getState().addToCollection(second,station);
 expect(useLibrary.getState().collections.map(c=>c.stations.length)).toEqual([1,1]);
 expect(useLibrary.getState().collections[0].stations[0].name).toBe('Actualizada');
 useLibrary.getState().removeFromCollection(first,station.id);
 expect(useLibrary.getState().collections.map(c=>c.stations.length)).toEqual([0,1]);
});
it('deletes a collection without deleting favorites or history',()=>{
 const id=useLibrary.getState().createCollection('Uno')!;
 useLibrary.getState().toggle(station);useLibrary.getState().remember(station);
 useLibrary.getState().addToCollection(id,station);useLibrary.getState().deleteCollection(id);
 expect(useLibrary.getState().collections).toEqual([]);
 expect(useLibrary.getState().favorites).toEqual([station]);
 expect(useLibrary.getState().history).toEqual([station]);
});
it('reads old libraries without losing favorites and persists new collections',async()=>{
 storage.getItem.mockResolvedValueOnce(JSON.stringify({state:{favorites:[station],history:[],searches:[],country:'PE',theme:'light'},version:0}));
 await useLibrary.persist.rehydrate();
 expect(useLibrary.getState().collections).toEqual([]);
 const id=useLibrary.getState().createCollection('Persistida')!;
 useLibrary.getState().addToCollection(id,station);
 const last=storage.setItem.mock.calls.at(-1) as unknown as [string,string];
 storage.getItem.mockResolvedValueOnce(last[1]);
 useLibrary.getState().clear();await useLibrary.persist.rehydrate();
 expect(useLibrary.getState().collections[0].stations[0].id).toBe('a');
 expect(useLibrary.getState().favorites[0].id).toBe('a');
});
it('clears all library data including collections while keeping preferences',()=>{
 useLibrary.getState().createCollection('Uno');useLibrary.getState().setCountry('JP');
 useLibrary.getState().setTheme('light');useLibrary.getState().clear();
 expect(useLibrary.getState().collections).toEqual([]);
 expect(useLibrary.getState().country).toBe('JP');expect(useLibrary.getState().theme).toBe('light');
});
it('refreshes saved snapshots from the catalog without removing or reordering stations',()=>{
 const id=useLibrary.getState().createCollection('Viajes')!;
 useLibrary.getState().toggle(station);useLibrary.getState().toggle({...station,id:'gone',name:'Gone',streamUrl:'https://example.com/gone'});
 useLibrary.getState().remember(station);useLibrary.getState().addToCollection(id,station);
 useLibrary.getState().refreshStations([{...station,name:'Fixture renovada',streams:['https://example.com/alt']}]);
 const s=useLibrary.getState();
 expect(s.favorites.map(x=>x.id)).toEqual(['gone','a']);
 expect(s.favorites[1].name).toBe('Fixture renovada');
 expect(s.history[0].streams).toEqual(['https://example.com/alt']);
 expect(s.collections[0].stations[0].name).toBe('Fixture renovada');
 expect(s.refreshedAt).toBeGreaterThan(0);
});
it('does not show onboarding again to people upgrading with an existing library',async()=>{
 storage.getItem.mockResolvedValueOnce(JSON.stringify({state:{favorites:[station],history:[],searches:[],country:'JP',theme:'dark'},version:0}));
 await useLibrary.persist.rehydrate();
 expect(useLibrary.getState().onboarded).toBe(true);
 expect(useLibrary.getState().country).toBe('JP');
 storage.getItem.mockResolvedValueOnce(JSON.stringify({state:{favorites:[],history:[],searches:[],country:'PE',theme:'system'},version:0}));
 useLibrary.setState({onboarded:false});await useLibrary.persist.rehydrate();
 expect(useLibrary.getState().onboarded).toBe(false);
});
it('follows the device country automatically until the person chooses one',()=>{
 useLibrary.setState({country:'PE',countryMode:'auto'});
 useLibrary.getState().syncDeviceCountry('CL');expect(useLibrary.getState().country).toBe('CL');
 useLibrary.getState().setCountry('JP');expect(useLibrary.getState().countryMode).toBe('manual');
 useLibrary.getState().syncDeviceCountry('PE');expect(useLibrary.getState().country).toBe('JP');
 useLibrary.getState().followDeviceCountry('PE');expect(useLibrary.getState()).toMatchObject({country:'PE',countryMode:'auto'});
});
it('treats catalog duplicates of the same broadcast as one entry in history',()=>{
 useLibrary.getState().remember(station);
 useLibrary.getState().remember({...station,id:'dup-stream',name:'Otro nombre',streamUrl:'https://example.com/test/'});
 useLibrary.getState().remember({...station,id:'dup-name',name:'  fixture ',streamUrl:'https://other.example/x'});
 useLibrary.getState().remember({...station,id:'other',name:'Fixture',countryCode:'CL',streamUrl:'https://cl.example/x'});
 expect(useLibrary.getState().history.map(s=>s.id)).toEqual(['other','dup-name','dup-stream']);
 expect(uniqueBroadcasts([station,{...station,id:'copy'},{...station,id:'b',name:'B',streamUrl:'https://b'}]).map(s=>s.id)).toEqual(['a','b']);
});
