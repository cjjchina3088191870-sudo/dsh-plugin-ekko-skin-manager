// Startup behavior adapted from dsh-video-skin (MIT, Something11235):
// inline startup, body-owned overlay, sound fallback, skip, bounded playback and fixed fade.
export const BOOT_CSS=`
.ekko-boot{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:#10171e;color:#fff;opacity:1;isolation:isolate;font:14px/1.5 system-ui,sans-serif}
.ekko-boot[data-skin="rose"]{background:#241a20;--boot-accent:#f3b3c6}.ekko-boot[data-skin="miku"]{--boot-accent:#81eff0}
.ekko-boot video{display:block;width:100%;height:100%;position:absolute;inset:0;object-fit:cover}
.ekko-boot:after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 0 2px var(--boot-accent),inset 0 -100px 100px -75px #000b}
.ekko-boot button{position:relative;z-index:2;cursor:pointer;border:1px solid #fff8;background:#101820b8;color:white;border-radius:999px;min-height:44px;padding:9px 16px;font:inherit;backdrop-filter:blur(8px)}
.ekko-boot button:focus-visible{outline:3px solid var(--boot-accent);outline-offset:3px}
.ekko-boot-skip{position:absolute!important;right:max(18px,env(safe-area-inset-right));top:max(18px,env(safe-area-inset-top))}
.ekko-boot-footer{position:absolute;bottom:max(20px,env(safe-area-inset-bottom));left:max(20px,env(safe-area-inset-left));right:max(20px,env(safe-area-inset-right));display:grid;gap:10px;z-index:2;text-shadow:0 1px 8px #000}
.ekko-boot-toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.ekko-boot-toolbar span{margin-left:auto}.ekko-boot progress{width:100%;height:4px;accent-color:var(--boot-accent)}
@media(prefers-reduced-motion:reduce){.ekko-boot{scroll-behavior:auto}}
`;
const text=()=>/^zh/i.test(document.documentElement.lang||navigator.language)?{
 skip:'跳过视频',sound:'开启声音',mute:'静音',play:'播放视频',loading:'正在加载启动视频…',hint:'点击画面或按 Esc 跳过',title:'主题启动视频'
}:{skip:'Skip video',sound:'Enable sound',mute:'Mute',play:'Play video',loading:'Loading startup video…',hint:'Click the picture or press Esc to skip',title:'Theme startup video'};
export const MOBILE_SCREEN='(max-width: 768px), (hover: none) and (pointer: coarse) and (max-height: 768px)';
export function selectBootVideo(entry,mobile=false){
 if(!entry)return entry;
 return mobile&&entry.mobile?{...entry,...entry.mobile,device:'mobile'}:{...entry,device:mobile?'mobile':'desktop'};
}
export function videoSources(options,canPlayWebM){
 const original=options?.url,alternate=options?.fallbackUrl;
 return [...new Set((canPlayWebM?[alternate,original]:[original,alternate]).filter(Boolean))];
}
export function playBoot(skin,options,{preview=false}={}){
 if(!options?.url||options.available===false||(!preview&&!options.enabled))return Promise.resolve();
 if(!preview&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();
 if(document.querySelector('.ekko-boot'))return Promise.resolve();
 let c=text();const overlay=document.createElement('section'),video=document.createElement('video');
 overlay.className='ekko-boot';overlay.dataset.skin=skin;overlay.dataset.device=options.device||'desktop';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',c.title);
 const style=document.createElement('style');style.dataset.ekkoBoot='';style.textContent=BOOT_CSS;document.head.append(style);
 video.playsInline=true;video.preload='auto';video.muted=!options.sound;video.volume=options.volume??.65;video.style.objectFit=options.fit||'cover';
 const sources=videoSources(options,Boolean(video.canPlayType('video/webm; codecs="vp8, opus"')));let sourceIndex=0;video.src=sources[sourceIndex];
 const button=(label,cl)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cl||'';return b;};
 const skip=button(c.skip,'ekko-boot-skip'),sound=button(video.muted?c.sound:c.mute),play=button(c.play);play.hidden=true;
 const footer=document.createElement('div');footer.className='ekko-boot-footer';
 const toolbar=document.createElement('div');toolbar.className='ekko-boot-toolbar';const hint=document.createElement('span');hint.textContent=c.loading;
 const progress=document.createElement('progress');progress.max=1;progress.value=0;progress.setAttribute('aria-label',c.title);
 toolbar.append(sound,play,hint);footer.append(toolbar,progress);overlay.append(video,skip,footer);document.body.append(overlay);
 const previousFocus=document.activeElement,root=document.getElementById('root'),previousInert=root?.inert;
 if(root)root.inert=true;skip.focus();
 const localeObserver=new MutationObserver(()=>{c=text();skip.textContent=c.skip;sound.textContent=video.muted?c.sound:c.mute;play.textContent=c.play;hint.textContent=video.currentTime>0?c.hint:c.loading;overlay.setAttribute('aria-label',c.title);progress.setAttribute('aria-label',c.title);});localeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 let leaving=false,finished=false,frame=0,playTimer,loadTimer,resolve;
 const done=new Promise(r=>resolve=r);
 function cleanup(){
  if(finished)return;finished=true;clearTimeout(loadTimer);clearTimeout(playTimer);cancelAnimationFrame(frame);
  localeObserver.disconnect();document.removeEventListener('keydown',key,true);video.pause();video.removeAttribute('src');video.load();overlay.remove();style.remove();
  if(root)root.inert=previousInert;
  if(previousFocus?.isConnected&&previousFocus!==document.body)previousFocus.focus({preventScroll:true});resolve();
 }
 function leave(ms=800){
  if(leaving)return;leaving=true;clearTimeout(loadTimer);clearTimeout(playTimer);cancelAnimationFrame(frame);
  const start=performance.now(),volume=video.volume;
  const fade=()=>{if(finished)return;const p=Math.min(1,(performance.now()-start)/ms);overlay.style.opacity=String(1-p);video.volume=volume*(1-p);if(p===1)cleanup();else frame=requestAnimationFrame(fade);};frame=requestAnimationFrame(fade);
  // Animation frames can be suspended in a background tab.
  playTimer=setTimeout(cleanup,ms+150);
 }
 function key(e){
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();leave(250);}
  if(e.key==='Tab'){const buttons=[skip,sound,...play.hidden?[]:[play]],index=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}
 }
 document.addEventListener('keydown',key,true);
 skip.onclick=e=>{e.stopPropagation();leave(250);};overlay.onclick=e=>{if(!e.target.closest('button'))leave(250);};
 sound.onclick=async e=>{e.stopPropagation();video.muted=!video.muted;try{await video.play();}catch{play.hidden=false;}sound.textContent=video.muted?c.sound:c.mute;};
 play.onclick=async e=>{e.stopPropagation();try{await video.play();play.hidden=true;}catch{video.muted=true;sound.textContent=c.sound;try{await video.play();play.hidden=true;}catch{leave(200);}}};
 video.addEventListener('ended',()=>leave());video.addEventListener('error',()=>{
  if(finished||leaving)return;
  if(sourceIndex+1<sources.length){
   clearTimeout(loadTimer);loadTimer=setTimeout(()=>leave(200),12000);
   video.src=sources[++sourceIndex];video.load();void startPlayback();
  }else leave(200);
 });
 video.addEventListener('playing',()=>{clearTimeout(loadTimer);play.hidden=true;if(!playTimer)playTimer=setTimeout(()=>leave(),Math.max(5,Math.min(60,options.maxSeconds||30))*1000);hint.textContent=c.hint;});
 video.addEventListener('timeupdate',()=>{if(Number.isFinite(video.duration)&&video.duration>0)progress.value=Math.min(1,video.currentTime/video.duration);});
 loadTimer=setTimeout(()=>leave(200),12000);
 async function startPlayback(){try{await video.play();}catch{if(finished||leaving)return;video.muted=true;sound.textContent=c.sound;try{await video.play();}catch{if(!finished&&!leaving)play.hidden=false;}}}
 void startPlayback();
 return done;
}
export function bootOnce({defaultSkin='miku'}={}){
 if(window.__EKKO_BOOT_STARTED__)return;window.__EKKO_BOOT_STARTED__=true;
 let skin=defaultSkin;try{const saved=JSON.parse(localStorage.getItem('dsh:ekko-skins:selection:v1'));if(saved?.version===1&&['rose','miku','skirk','default'].includes(saved.skin))skin=saved.skin;}catch{}
 if(!['rose','miku','skirk'].includes(skin))return;
 void(async()=>{try{
  const response=await fetch('./api/ekko-skins/boot',{credentials:'same-origin',signal:AbortSignal.timeout(3000)});
  if(!response.ok)return;const state=await response.json();await playBoot(skin,selectBootVideo(state.skins?.[skin],Boolean(window.matchMedia?.(MOBILE_SCREEN).matches)));
 }catch{/* The startup decoration must never reject the native boot promise. */}})();
}
