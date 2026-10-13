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
