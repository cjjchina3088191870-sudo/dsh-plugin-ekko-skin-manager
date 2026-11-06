import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {playBoot,selectBootVideo,videoSources} from '../src/boot-player.mjs';
const require=createRequire(process.env.DSH_SKIN_MANAGER_TOOLCHAIN||new URL('../package.json',import.meta.url));
const {JSDOM}=require('jsdom');
function fixture(t,{blocked=false,reduced=false}={}){
 const dom=new JSDOM('<html lang="zh-CN"><head></head><body><div id="root"><button id="prior">设置</button></div></body></html>',{url:'http://localhost'}),w=dom.window,timers=new Map(),original=new Map();let now=0,next=0,calls=0;
 const set=(key,value)=>{original.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
 for(const key of ['window','document','navigator','MutationObserver'])set(key,key==='window'?w:w[key]);
 set('performance',{now:()=>now});set('setTimeout',(fn,delay=0)=>{timers.set(++next,{at:now+delay,fn});return next;});set('clearTimeout',id=>timers.delete(id));set('requestAnimationFrame',fn=>setTimeout(fn,16));set('cancelAnimationFrame',id=>clearTimeout(id));
 w.matchMedia=()=>({matches:reduced});w.document.getElementById('root').inert=false;w.document.getElementById('prior').focus();
 w.HTMLMediaElement.prototype.play=function(){calls++;return blocked&&calls===1?Promise.reject(Error('autoplay blocked')):Promise.resolve();};w.HTMLMediaElement.prototype.pause=function(){};w.HTMLMediaElement.prototype.load=function(){};
 const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
 async function tick(ms){const end=now+ms;for(;;){const item=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!item)break;now=item[1].at;timers.delete(item[0]);item[1].fn();await flush();}now=end;await flush();}
 t.after(()=>{for(const[key,descriptor]of original){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}w.close();});
 return{w,flush,tick,calls:()=>calls};
}
const options={url:'/video.mp4',enabled:true,sound:true,volume:.65,maxSeconds:5};
test('autoplay fallback, sound control, one overlay and Escape release focus without changing the native app',async t=>{
 const f=fixture(t,{blocked:true}),done=playBoot('miku',options);await f.flush();
 const overlay=document.querySelector('.ekko-boot'),video=overlay.querySelector('video');assert.equal(video.muted,true);assert.equal(f.calls(),2);
 await playBoot('rose',options);assert.equal(document.querySelectorAll('.ekko-boot').length,1);
 const sound=[...overlay.querySelectorAll('button')].find(b=>b.textContent==='开启声音');sound.click();await f.flush();assert.equal(video.muted,false);assert.ok(overlay.isConnected);
 document.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await f.tick(500);await done;
 assert.equal(document.querySelector('.ekko-boot'),null);assert.equal(document.getElementById('root').inert,false);assert.equal(document.activeElement.id,'prior');assert.equal(document.querySelector('#root button').textContent,'设置');
});
test('decode failure and a missing first frame cannot leave the startup overlay blocking DSH',async t=>{
 const f=fixture(t);let done=playBoot('rose',options);document.querySelector('.ekko-boot video').dispatchEvent(new f.w.Event('error'));await f.tick(500);await done;assert.equal(document.querySelector('.ekko-boot'),null);
 done=playBoot('miku',options);await f.tick(13000);await done;assert.equal(document.querySelector('.ekko-boot'),null);assert.equal(document.getElementById('root').inert,false);
});
test('normal ending fades over a fixed interval and playback has an absolute upper bound',async t=>{
 const f=fixture(t);let done=playBoot('miku',options),video=document.querySelector('.ekko-boot video');video.dispatchEvent(new f.w.Event('ended'));await f.tick(400);assert.ok(document.querySelector('.ekko-boot'));assert.ok(video.volume>0&&video.volume<.65);await f.tick(500);await done;
 done=playBoot('miku',options);video=document.querySelector('.ekko-boot video');video.dispatchEvent(new f.w.Event('playing'));await f.tick(6000);await done;assert.equal(document.querySelector('.ekko-boot'),null);
});
test('reduced motion suppresses automatic startup but permits an explicit preview',async t=>{
 const f=fixture(t,{reduced:true});await playBoot('miku',options);assert.equal(f.calls(),0);
 const done=playBoot('miku',options,{preview:true});assert.equal(f.calls(),1);document.querySelector('.ekko-boot-skip').click();await f.tick(500);await done;
});


test('phone startup selects its own video and fit while keeping shared playback preferences',()=>{
 const entry={...options,file:'wide.mp4',fit:'cover',source:'upload',mobile:{url:'/portrait.webm',file:'portrait.webm',fit:'contain',source:'upload',available:true}};
 const phone=selectBootVideo(entry,true);assert.equal(phone.url,'/portrait.webm');assert.equal(phone.fit,'contain');assert.equal(phone.volume,.65);assert.equal(phone.device,'mobile');assert.equal(selectBootVideo(entry).url,options.url);assert.equal(entry.url,options.url);
 const fallback=selectBootVideo({...entry,mobile:{url:options.url,fit:'contain',source:'fallback'}},true);assert.equal(fallback.url,options.url);assert.equal(fallback.source,'fallback');assert.equal(selectBootVideo(undefined,true),undefined);
});


test('WebM-capable browsers prefer the alternate encoding and fall back to MP4 after a media error',async t=>{
 const f=fixture(t);f.w.HTMLMediaElement.prototype.canPlayType=()=> 'probably';
 const done=playBoot('rose',{...options,fallbackUrl:'/compatible.webm'}),video=document.querySelector('.ekko-boot video');assert.equal(video.getAttribute('src'),'/compatible.webm');
 video.dispatchEvent(new f.w.Event('error'));await f.flush();assert.equal(video.getAttribute('src'),options.url);assert.ok(document.querySelector('.ekko-boot'));
 video.dispatchEvent(new f.w.Event('playing'));await f.tick(100);assert.equal(document.querySelector('.ekko-boot').style.opacity,'');
 video.dispatchEvent(new f.w.Event('error'));await f.tick(500);await done;assert.equal(document.querySelector('.ekko-boot'),null);
 assert.deepEqual(videoSources({url:'/a.mp4',fallbackUrl:'/a.webm'},false),['/a.mp4','/a.webm']);assert.deepEqual(videoSources({url:'/a.mp4',fallbackUrl:'/a.mp4'},true),['/a.mp4']);
});
