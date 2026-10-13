import type {RoomMedia} from './types';

/** No session tokens enter the embed. Escape HTML-sensitive characters in provider data. */
export function roomPlayerHtml(media: RoomMedia, host: boolean, origin: string) {
  const data = JSON.stringify({media, host, origin}).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body{margin:0;background:#080f20;color:white;width:100%;height:100%;font:14px system-ui}#player,video{width:100%;height:100%;min-height:200px}audio{width:100%;position:absolute;top:50%;transform:translateY(-50%)}#hint{padding:20px;position:absolute;top:0;pointer-events:none}</style></head><body><div id="player"></div><script>
const config=${data};let p=null,ready=false,silence=0,lastTime=0,lastTick=Date.now(),pending=null;
const send=o=>{const text=JSON.stringify(o);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(text);else parent.postMessage({ondaMedia:o},'*')};
const time=()=>config.media.kind==='youtube'?(p&&p.getCurrentTime?p.getCurrentTime():0):(p?p.currentTime:0);
const playing=()=>config.media.kind==='youtube'?p&&p.getPlayerState&&p.getPlayerState()===1:p&&!p.paused;
const event=()=>{if(ready&&config.host&&Date.now()>silence)send({kind:'control',playing:!!playing(),position:time()})};
window.setRoomPlayback=state=>{pending=state;if(!ready)return;silence=Date.now()+1500;const pos=Math.max(0,state.position||0);if(config.media.kind==='youtube'){if(Math.abs(time()-pos)>2)p.seekTo(pos,true);state.playing?p.playVideo():p.pauseVideo();state.muted?p.mute():p.unMute()}else{if(Number.isFinite(pos)&&Math.abs(time()-pos)>2&&Number.isFinite(p.duration))p.currentTime=Math.min(pos,p.duration);p.muted=!!state.muted;if(state.playing){const promise=p.play();if(promise)promise.catch(()=>send({kind:'tap'}))}else p.pause()}lastTime=time();lastTick=Date.now()};
window.addEventListener('message',e=>{if(e.source!==parent)return;if(e.data&&e.data.ondaPlayback)window.setRoomPlayback(e.data.ondaPlayback)});
const becomeReady=()=>{ready=true;send({kind:'ready'});if(pending)window.setRoomPlayback(pending)};
if(config.media.kind==='youtube'){
 window.onYouTubeIframeAPIReady=()=>{p=new YT.Player('player',{width:'100%',height:'100%',videoId:config.media.videoId,playerVars:{playsinline:1,origin:config.origin,rel:0},events:{onReady:becomeReady,onStateChange:e=>{if(e.data===1||e.data===2)event();if(e.data===0)send({kind:'ended'})},onError:e=>send({kind:'error',code:e.data})}})};
 const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';document.head.appendChild(script);
}else{
 p=document.createElement(config.media.kind==='audio'?'audio':'video');p.controls=true;p.playsInline=true;p.preload='metadata';p.src=config.media.url;document.getElementById('player').replaceWith(p);
 p.addEventListener('loadedmetadata',becomeReady);['play','pause','seeked'].forEach(e=>p.addEventListener(e,event));p.addEventListener('ended',()=>send({kind:'ended'}));p.addEventListener('error',()=>send({kind:'error',code:0}));
}
setInterval(()=>{if(!ready)return;const now=Date.now(),current=time();send({kind:'progress',position:current,duration:config.media.kind==='youtube'?(p.getDuration?p.getDuration():0):p.duration});if(config.host&&playing()&&now>silence&&Math.abs(current-lastTime-(now-lastTick)/1000)>4)event();lastTime=current;lastTick=now},2000);
</script></body></html>`;
}
