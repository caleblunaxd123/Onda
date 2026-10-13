import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerEngine, type NativeStatus } from './player-engine';
import type { Station } from './types';
const station:Station={id:'one',name:'One',country:'Peru',countryCode:'PE',language:'spanish',tags:[],streamUrl:'https://example.com/live',artworkUrl:null,codec:'MP3',bitrate:128,votes:1,latitude:null,longitude:null};
describe('Global audio lifecycle',()=>{
 beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
 const setup=()=>{
 const handles:{dispose:ReturnType<typeof vi.fn>;play:ReturnType<typeof vi.fn>;pause:ReturnType<typeof vi.fn>;emit:(s:NativeStatus)=>void}[]=[];
 const engine=new PlayerEngine((_,emit)=>{const h={play:vi.fn(),pause:vi.fn(),dispose:vi.fn(),emit};handles.push(h);return h;});return {engine,handles};
 };
 it('disposes the previous stream and ignores its late callbacks',()=>{
 const {engine,handles}=setup();engine.select(station);engine.select({...station,id:'two'});
 expect(handles[0].dispose).toHaveBeenCalledOnce();
 handles[0].emit({loaded:true,playing:true,buffering:false});expect(engine.snapshot.state).toBe('connecting');
 handles[1].emit({loaded:true,playing:true,buffering:false});expect(engine.snapshot.state).toBe('playing');
 engine.dispose();
 });
 it('uses bounded retries and reports an unavailable stream',()=>{
 const {engine,handles}=setup();engine.select(station);vi.advanceTimersByTime(70000);
 expect(handles).toHaveLength(4);expect(engine.snapshot.state).toBe('error');engine.dispose();
 });
 it('does not reconnect after user pauses while waiting',()=>{
 const {engine,handles}=setup();engine.select(station);engine.toggle();vi.advanceTimersByTime(60000);
 expect(handles).toHaveLength(1);expect(engine.snapshot.state).toBe('paused');engine.dispose();
 });
 it('reconnects only if playback was requested when internet returns',()=>{
 const {engine,handles}=setup();engine.select(station);engine.setOnline(false);engine.setOnline(true);
 expect(handles).toHaveLength(2);engine.toggle();engine.setOnline(false);engine.setOnline(true);expect(handles).toHaveLength(2);engine.dispose();
 });
 it('sleep timer disposes audio and prevents retries',()=>{
 const {engine,handles}=setup();engine.select(station);handles[0].emit({loaded:true,playing:true,buffering:false});engine.setSleep(1);vi.advanceTimersByTime(60000);
 expect(engine.snapshot.state).toBe('paused');expect(handles[0].dispose).toHaveBeenCalledOnce();engine.dispose();
 });
 it('refuses non-HTTPS stream URLs',()=>{
 const {engine,handles}=setup();engine.select({...station,streamUrl:'file:///private'});
 expect(handles).toHaveLength(0);expect(engine.snapshot.state).toBe('error');engine.dispose();
 });
 it('respects a pause from lock-screen controls when connectivity changes',()=>{
 const {engine,handles}=setup();engine.select(station);
 handles[0].emit({loaded:true,playing:true,buffering:false});
 handles[0].emit({loaded:true,playing:false,buffering:false});
 engine.setOnline(false);engine.setOnline(true);
 expect(engine.snapshot.state).toBe('paused');expect(handles).toHaveLength(1);engine.dispose();
 });
});
