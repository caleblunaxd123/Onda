import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {PlayerEngine,type NativeStatus} from './player-engine';
import {lockScreenMetadata,watchNowPlaying,type MetadataReply} from './now-playing';
import type {Station} from './types';
const station: Station={id:'one',name:'Radio One',country:'Perú',countryCode:'PE',language:'es',tags:[],streamUrl:'https://example.com/live',artworkUrl:null,codec:'MP3',bitrate:128,votes:1,latitude:null,longitude:null};
const playing: NativeStatus={loaded:true,playing:true,buffering:false};
const reply=(id='one',title='Artist - Song'): MetadataReply=>({stationId:id,source:1,status:'available',title,observedAt:new Date().toISOString()});
beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
const setup=()=>{
 const events: ((s: NativeStatus)=>void)[]=[];const setMetadata=vi.fn();
 const engine=new PlayerEngine((_s,_url,emit)=>{events.push(emit);return {play:vi.fn(),pause:vi.fn(),dispose:vi.fn(),setMetadata};});
 return {engine,events,setMetadata};
};
it('polls only the current playing station and updates lock screen data without changing audio',async()=>{
 const {engine,events,setMetadata}=setup();const get=vi.fn().mockResolvedValue(reply());const stop=watchNowPlaying(engine,get);
 engine.select(station);expect(get).not.toHaveBeenCalled();events[0](playing);await vi.advanceTimersByTimeAsync(0);
 expect(engine.snapshot.nowPlaying).toBe('Artist - Song');expect(setMetadata).toHaveBeenLastCalledWith('Artist - Song');
 engine.toggle();expect(engine.snapshot.nowPlaying).toBeNull();await vi.advanceTimersByTimeAsync(120000);expect(get).toHaveBeenCalledOnce();stop();engine.dispose();
});
it('aborts and rejects late song replies when changing station, even if the original station is selected again',async()=>{
 const {engine,events}=setup();let resolve!: (reply:MetadataReply)=>void;let firstSignal!:AbortSignal;
 const get=vi.fn((_p:string,signal:AbortSignal)=>{firstSignal=signal;return new Promise<MetadataReply>(r=>{resolve=r;});});
 const stop=watchNowPlaying(engine,get);engine.select(station);events[0](playing);
 const oldResolve=resolve;const oldSignal=firstSignal;engine.select({...station,id:'two'});events[1](playing);
 expect(oldSignal.aborted).toBe(true);oldResolve(reply());await vi.advanceTimersByTimeAsync(0);expect(engine.snapshot.nowPlaying).toBeNull();
 stop();engine.dispose();
});
it('clears unavailable or stale titles instead of keeping a previous song',async()=>{
 const {engine,events}=setup();const get=vi.fn().mockResolvedValueOnce(reply()).mockResolvedValueOnce({...reply(),status:'unavailable',title:null,observedAt:null}).mockResolvedValue({...reply(),observedAt:new Date(Date.now()-300000).toISOString()});
 const stop=watchNowPlaying(engine,get);engine.select(station);events[0](playing);await vi.advanceTimersByTimeAsync(0);expect(engine.snapshot.nowPlaying).toBeTruthy();
 await vi.advanceTimersByTimeAsync(30000);expect(engine.snapshot.nowPlaying).toBeNull();await vi.advanceTimersByTimeAsync(30000);expect(engine.snapshot.nowPlaying).toBeNull();stop();engine.dispose();
});
it('backs off unsupported streams and ignores metadata for the wrong source',async()=>{
 const {engine,events}=setup();const get=vi.fn().mockResolvedValue({...reply(),status:'unsupported',title:null,observedAt:null});
 const stop=watchNowPlaying(engine,get);engine.select(station);events[0](playing);await vi.advanceTimersByTimeAsync(0);
 engine.setMetadata('one',2,'Wrong source','available');expect(engine.snapshot.nowPlaying).toBeNull();
 await vi.advanceTimersByTimeAsync(60000);expect(get).toHaveBeenCalledOnce();await vi.advanceTimersByTimeAsync(60000);expect(get).toHaveBeenCalledTimes(2);stop();engine.dispose();
});
it('always identifies the station and supplies ONDA artwork when a broadcaster has no logo',()=>{
 expect(lockScreenMetadata(station,'Artist - Song')).toMatchObject({title:'Artist - Song',artist:'Radio One',albumTitle:'ONDA · El mundo suena aquí',artworkUrl:'https://onda.lunalav.pe/brand/onda-radio.png'});
 expect(lockScreenMetadata({...station,artworkUrl:'https://example.com/logo.png'},null)).toMatchObject({title:'Radio One',artworkUrl:'https://example.com/logo.png'});
});
it('does not let an OS metadata failure stop playback or hide the title',()=>{
 const engine=new PlayerEngine((_s,_url,emit)=>{queueMicrotask(()=>emit(playing));return {play:vi.fn(),pause:vi.fn(),dispose:vi.fn(),setMetadata:()=>{throw new Error('OS unavailable');}};});
 engine.select(station);engine.snapshot={...engine.snapshot,state:'playing'};engine.setMetadata('one',1,'Published title','available');expect(engine.snapshot).toMatchObject({state:'playing',nowPlaying:'Published title'});engine.dispose();
});
