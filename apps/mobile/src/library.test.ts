import { beforeEach, expect, it, vi } from 'vitest';
import { useLibrary } from './library';
import type { Station } from './types';
const storage = vi.hoisted(() => ({getItem:vi.fn(async (_key:string):Promise<string|null>=>null),setItem:vi.fn(async()=>{}),removeItem:vi.fn(async()=>{})}));
vi.mock('@react-native-async-storage/async-storage',()=>({default:storage}));
const station:Station={id:'a',name:'Fixture',country:'Peru',countryCode:'PE',language:'spanish',tags:[],streamUrl:'https://example.com/test',artworkUrl:null,codec:'MP3',bitrate:128,votes:0,latitude:null,longitude:null};
beforeEach(()=>{useLibrary.getState().clear();vi.clearAllMocks();});
it('toggles favorites without duplicates and persists locally',()=>{
 useLibrary.getState().toggle(station);expect(useLibrary.getState().favorites).toHaveLength(1);
 expect(storage.setItem).toHaveBeenCalled();
 useLibrary.getState().toggle(station);expect(useLibrary.getState().favorites).toHaveLength(0);
});
it('deduplicates history and retains most recent station first',()=>{
 useLibrary.getState().remember(station);useLibrary.getState().remember({...station,id:'b'});useLibrary.getState().remember(station);
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
