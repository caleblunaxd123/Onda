import {defaultSyncConfig, type SyncConfig} from './sync-engine';
import type {RoomMedia} from './types';

/** No session tokens enter the embed. Escape HTML-sensitive characters in provider data. */
export function roomPlayerHtml(media: RoomMedia, host: boolean, origin: string, sync: SyncConfig = defaultSyncConfig) {
  const data = JSON.stringify({media, host, origin, sync}).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body{margin:0;background:#080a10;color:white;width:100%;height:100%;overflow:hidden;font:14px system-ui;color-scheme:dark}#player,video{width:100%;height:100%;min-height:190px;border:0;display:block}audio{width:100%;position:absolute;top:50%;transform:translateY(-50%)}#hint{padding:20px;position:absolute;top:0;pointer-events:none}</style></head><body><div id="player"></div><script>
const config=${data};let p=null,ready=false,silence=0,lastProgress=0,pending=null,navigating=false,restoring=false,revision=null,canonicalPlaying=null,lastPublished=null;
const send=o=>{const text=JSON.stringify(o);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(text);else parent.postMessage({ondaMedia:o},'*')};
const time=()=>config.media.kind==='youtube'?(p&&p.getCurrentTime?(p.getPlayerState()===5&&anchor?anchor.position:p.getCurrentTime()):0):(p?p.currentTime:0);
const playing=()=>config.media.kind==='youtube'?p&&p.getPlayerState&&p.getPlayerState()===1:p&&!p.paused;
const providerNavigation=()=>{
 if(config.media.kind!=='youtube'||!ready||!p.getVideoUrl)return false;
 let id;try{id=new URL(p.getVideoUrl()).searchParams.get('v')}catch{return false}
 if(!id||!(/^[a-zA-Z0-9_-]{11}$/).test(id))return false;
 if(id===config.media.videoId){if(restoring){restoring=false;if(pending)window.setRoomPlayback(pending)}return false}
 if(!config.host){restoring=true;silence=Date.now()+1000;p.loadVideoById({videoId:config.media.videoId,startSeconds:pending?pending.position:0});return true}
 if(p.getPlayerState()===3||p.getPlayerState()===-1)return true;
 if(!navigating){navigating=true;send({kind:'source',url:'https://www.youtube.com/watch?v='+id,position:time(),playing:!!playing()})}
 return true;
};
const projected=a=>a.position+(a.playing?Math.max(0,Date.now()-a.at)/1000:0);
const event=()=>{if(providerNavigation()||!ready||navigating||!config.host||Date.now()<=silence)return;
 const position=time(),isPlaying=!!playing();
 if(anchor&&anchor.playing===isPlaying&&Math.abs(position-projected(anchor))<=config.sync.tolerance)return;
 if(lastPublished&&lastPublished.playing===isPlaying&&Math.abs(position-projected(lastPublished))<=1.5)return;
 lastPublished={position,playing:isPlaying,at:Date.now()};send({kind:'control',playing:isPlaying,position})};
const remote=()=>{silence=Date.now()+1000};let anchor=null;
const correct=(expected,isPlaying)=>{const c=config.sync,drift=expected-time(),size=Math.abs(drift);if(!Number.isFinite(expected))return;
 if(config.media.kind==='youtube'){if(size>c.seekThreshold){remote();p.seekTo(expected,true)}return}
 if(!Number.isFinite(p.duration))return;
 if(size<=c.tolerance){if(p.playbackRate!==1)p.playbackRate=1;return}
 if(size>c.seekThreshold||!isPlaying){remote();p.playbackRate=1;p.currentTime=Math.min(expected,p.duration);return}
 p.playbackRate=1+Math.max(-c.maxRateDelta,Math.min(c.maxRateDelta,drift/c.correctionWindow))};
window.setRoomPlayback=state=>{
 const numbered=Number.isSafeInteger(state.revision)&&state.revision>=0;
 if(numbered&&revision!==null&&state.revision<revision)return;
 pending=state;if(!ready||navigating)return;
 const sameRevision=numbered&&state.revision===revision, samePlayback=canonicalPlaying===!!state.playing;
 // A parent projection of the same revision must not undo the controller's local input before its acknowledgement.
 if(sameRevision&&samePlayback&&(config.host||config.media.kind==='youtube'&&p.getPlayerState()===5)){if(config.media.kind==='youtube')state.muted?p.mute():p.unMute();else p.muted=!!state.muted;return}
 if(!sameRevision)lastPublished=null;
 revision=numbered?state.revision:null;canonicalPlaying=!!state.playing;
 const pos=Math.max(0,state.position||0);anchor={position:pos,at:Date.now(),playing:!!state.playing};
 if(config.media.kind==='youtube'){
  // Cue a room entered in pause: seek+pause before the first frame can leave a black player. Cue preserves the official thumbnail.
  const initialStatus=p.getPlayerState();if(!state.playing&&(initialStatus===-1||initialStatus===5)){remote();p.cueVideoById({videoId:config.media.videoId,startSeconds:pos});state.muted?p.mute():p.unMute();return}
  // Pause before seeking. A seek on an already paused player can temporarily report buffering (3);
  // sending pauseVideo again at that moment can cancel fetching the target frame.
  if(!state.playing&&initialStatus!==2){remote();p.pauseVideo()}
  correct(pos,!!state.playing)
  if(state.playing&&initialStatus!==1&&initialStatus!==3){remote();p.playVideo()}
  state.muted?p.mute():p.unMute();
 }else{
  correct(pos,!!state.playing);
  p.muted=!!state.muted;if(state.playing&&p.paused){remote();const promise=p.play();if(promise)promise.catch(()=>send({kind:'tap'}))}else if(!state.playing&&!p.paused){remote();p.pause()}
 }
};
window.addEventListener('message',e=>{if(e.source!==parent)return;if(e.data&&e.data.ondaPlayback)window.setRoomPlayback(e.data.ondaPlayback)});
const becomeReady=()=>{ready=true;send({kind:'ready'});if(pending)window.setRoomPlayback(pending)};
if(config.media.kind==='youtube'){
 window.onYouTubeIframeAPIReady=()=>{p=new YT.Player('player',{width:'100%',height:'100%',videoId:config.media.videoId,playerVars:{playsinline:1,origin:config.origin,rel:0},events:{onReady:becomeReady,onAutoplayBlocked:()=>send({kind:'tap'}),onStateChange:e=>{if(providerNavigation())return;if(e.data===1)send({kind:'started'});if(e.data===1||e.data===2)event();if(e.data===0)send({kind:'ended'})},onError:e=>send({kind:'error',code:e.data})}})};
 const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';document.head.appendChild(script);
}else{
 p=document.createElement(config.media.kind==='audio'?'audio':'video');p.controls=true;p.playsInline=true;p.preload='metadata';p.src=config.media.url;document.getElementById('player').replaceWith(p);
 p.addEventListener('loadedmetadata',becomeReady);p.addEventListener('play',()=>send({kind:'started'}));['play','pause','seeked'].forEach(e=>p.addEventListener(e,event));p.addEventListener('ended',()=>send({kind:'ended'}));p.addEventListener('error',()=>send({kind:'error',code:0}));
}
setInterval(()=>{if(!ready||providerNavigation()||navigating)return;const now=Date.now(),current=time();
 if(!config.host&&anchor&&(config.media.kind!=='youtube'||p.getPlayerState()!==5))correct(projected(anchor),anchor.playing);
 if(now-lastProgress>=2000){lastProgress=now;send({kind:'progress',position:time(),playing:!!playing(),duration:config.media.kind==='youtube'?(p.getDuration?p.getDuration():0):p.duration})}
 const observable=config.media.kind!=='youtube'||p.getPlayerState()===1||p.getPlayerState()===2;
 if(config.host&&anchor&&observable&&now>silence&&(anchor.playing!==!!playing()||Math.abs(current-projected(anchor))>config.sync.seekThreshold))event()
},500);
</script></body></html>`;
}
