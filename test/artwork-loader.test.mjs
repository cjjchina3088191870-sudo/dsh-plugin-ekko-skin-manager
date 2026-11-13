import test from 'node:test';
import assert from 'node:assert/strict';
import {createArtworkLoader} from '../src/artwork-loader.mjs';
import {createController} from '../src/controller.mjs';

function images(behavior){
 const state={active:0,peak:0,urls:[]};
 class Image{
  set src(url){
   state.urls.push(url);state.active++;state.peak=Math.max(state.peak,state.active);this.active=true;
   const result=behavior(url);if(result==='hang')return;
   this.timer=setTimeout(()=>{this.finish();(result==='error'?this.onerror:this.onload)?.();},8);
  }
  finish(){if(this.active){this.active=false;state.active--;clearTimeout(this.timer);}}
  removeAttribute(){this.finish();}
 }
 return{Image,state};
}
const provider=urls=>({assets:Object.fromEntries(urls.map((url,i)=>[i,url]))});
test('cold artwork is loaded in bounded batches; queued images do not expire',async()=>{
 const {Image,state}=images(()=> 'load'),loader=createArtworkLoader({Image,concurrency:3,timeout:25});
 try{await loader.prepare(provider(Array.from({length:18},(_,i)=>'/art/'+i)));assert.equal(state.urls.length,18);assert.equal(state.peak,3);assert.equal(state.active,0);}finally{loader.dispose();}
});
test('transient failures retry with a new URL, while only successful assets are cached',async()=>{
 const seen=new Set(),{Image,state}=images(url=>{const key=url.split('?')[0];if(!seen.has(key)){seen.add(key);return 'error';}return 'load';});
 const loader=createArtworkLoader({Image,delays:[0],attempts:2});
 try{await loader.prepare(provider(['/a','/b','/a','data:image/svg+xml,abc']));assert.equal(state.urls.length,4);assert.equal(state.urls.filter(url=>url.includes('_ekko_retry=')).length,2);await loader.prepare(provider(['/a','/b']));assert.equal(state.urls.length,4);}finally{loader.dispose();}
});
test('permanent failures are reported and can be retried after service recovery',async()=>{
 let failing=true;const {Image,state}=images(()=>failing?'error':'load'),loader=createArtworkLoader({Image,attempts:2,delays:[0],message:()=> 'artwork unavailable'});
 try{await assert.rejects(loader.prepare(provider(['/missing'])),/artwork unavailable/);failing=false;await loader.prepare(provider(['/missing']));assert.equal(state.urls.length,3);}finally{loader.dispose();}
});
test('request timeout is retried and disposing interrupts active requests',async()=>{
 const {Image,state}=images(url=>url.includes('?')?'load':'hang'),loader=createArtworkLoader({Image,timeout:15,attempts:2,delays:[0]});
 await loader.prepare(provider(['/slow']));const pending=loader.prepare(provider(['/pending']));loader.dispose();await assert.rejects(pending,{name:'AbortError'});assert.equal(state.active,0);
});
test('changing selection cancels preparation without mounting the stale theme',async()=>{
 let started,aborted=false;const ready=new Promise(resolve=>started=resolve);
 const storage={getItem(){return null;},setItem(){}};
 const controller=createController({storage,prepare:(_, {signal})=>new Promise((_,reject)=>{started();signal.addEventListener('abort',()=>{aborted=true;reject(Object.assign(new Error('cancelled'),{name:'AbortError'}));},{once:true});}),mount(){throw Error('Stale provider mounted');}});
 controller.register({id:'skirk',plugin:{apply(){}}});
 const first=controller.initialize('skirk',['skirk']);await ready;await controller.choose('default');await first;
 assert.equal(aborted,true);assert.equal(controller.getSnapshot().selected,'default');assert.equal(controller.getSnapshot().error,null);await controller.dispose();
});
