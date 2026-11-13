import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import http from 'node:http';
import {createHandler} from '../src/index.mjs';
import {createMediaStore} from '../src/boot-media.mjs';
const require=createRequire(process.env.DSH_SKIN_MANAGER_TOOLCHAIN||new URL('../package.json',import.meta.url));
const {JSDOM}=require('jsdom');
const bundle=fileURLToPath(new URL('../../miku-publish/',import.meta.url));

test('compat manager loaded first accepts the bundled Skirk provider and keeps one shared client owner',async()=>{
 const dom=new JSDOM('<!doctype html><html lang="zh-CN"><head></head><body></body></html>',{url:'http://localhost',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,modules=new Map(),services=new Map();let sharedStarts=0,presentationStarts=0,sharedStops=0;
 w.localStorage.setItem('dsh:ekko-skins:selection:v1',JSON.stringify({version:1,skin:'skirk'}));
 w.fetch=async()=>({ok:true,json:async()=>({defaultSkin:'miku',skins:['rose','miku','skirk'].map(id=>({id,available:true,version:'test'}))})});
 w.Image=class{set src(value){this._src=value;w.queueMicrotask(()=>this.onload?.());}get src(){return this._src;}};
 w.__ModuleLoader__={load(entry){modules.set(entry.id,entry.factory(id=>id==='react'?{createElement(){},useEffect(){},useSyncExternalStore(){}}:require(id)));}};
 w.eval(await readFile(new URL('../lib/client.js',import.meta.url),'utf8'));
 w.eval(await readFile(join(bundle,'lib/client.js'),'utf8'));
 const leases=[];
 const makeContext=()=>{
  const cleanups=[];
  const context={root,get(name){return name==='layout'?{}:services.get(name);},provide(name,value){services.set(name,value);},slots:{inject(name,fn){return fn();},register(){return()=>{};}},inject(names,fn){fn(context);},effect(fn){const cleanup=fn();if(cleanup)cleanups.push(cleanup);},plugin(plugin,config){return root.plugin(plugin,config);}};
  return{context,async dispose(){for(const cleanup of cleanups.reverse())await cleanup?.();}};
 };
 const root={plugin(plugin,config){
  if(plugin.name==='ekko-skins-shared-client-v2'){
   sharedStarts++;const scope=makeContext();plugin.apply(scope.context,config);const fiber={await:async()=>{},async dispose(){sharedStops++;await scope.dispose();}};leases.push(fiber);return fiber;
  }
  presentationStarts++;return{await:async()=>{},dispose:async()=>{}};
 }};
 const compat=makeContext(),theme=makeContext();
 try{
  modules.get('dsh-plugin-ekko-skin-manager').apply(compat.context);
  modules.get('dsh-plugin-miku-theme').apply(theme.context);
  const controller=services.get('ekkoSkins');assert.ok(controller);
  for(let i=0;i<20&&controller.getSnapshot().selected!=='skirk';i++){await new Promise(r=>w.setTimeout(r,10));await controller.settled();}
  assert.equal(controller.getSnapshot().selected,'skirk');
  assert.ok(controller.getSnapshot().available.includes('skirk'));
  assert.equal(sharedStarts,1);assert.equal(presentationStarts,1);
  await compat.dispose();assert.equal(sharedStops,0,'removing the first lease must not stop the theme');
  await controller.choose('miku');assert.equal(controller.getSnapshot().selected,'miku');
  await theme.dispose();assert.equal(sharedStops,1);
 }finally{for(const fiber of leases)if(sharedStops===0)await fiber.dispose();w.close();}
});

test('compat host serves the bundled third skin and accepts its independent video settings',async t=>{
 const resolvePackage=name=>{if(name==='dsh-plugin-miku-theme')return bundle;throw Error('no separate Rose installed');};
 const server=http.createServer(createHandler({resolvePackage,defaultSkin:'skirk'}));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
 const catalog=await(await fetch(base+'/ekko-skins/catalog')).json();assert.equal(catalog.defaultSkin,'skirk');assert.deepEqual(catalog.skins.map(s=>[s.id,s.available]),[['rose',true],['miku',true],['skirk',true]]);
 const manifest=JSON.parse(await readFile(join(bundle,'assets/skirk/manifest.json'),'utf8'));
 assert.equal((await fetch(base+'/ekko-skins/assets/skirk/'+manifest.hero)).status,200);
 const font=await fetch(base+'/ekko-skins/assets/skirk/'+manifest['display-font']);assert.equal(font.status,200);assert.equal(font.headers.get('content-type'),'font/woff2');
 assert.equal((await fetch(base+'/ekko-skins/preview/skirk/light.webp')).status,200);
 const directory=await mkdtemp(join(tmpdir(),'ekko-skirk-compat-'));const media=await createMediaStore({directory,resolvePackage:id=>id==='skirk'?join(bundle,'assets/skirk'):bundle});t.after(async()=>{await media.close();await rm(directory,{recursive:true,force:true});});
 const before=media.snapshot();assert.ok(before.skins.skirk);const response=await media.settings(new Request('http://localhost/api/ekko-skins/boot-settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({skin:'skirk',device:'mobile',revision:before.revision,patch:{mobile:{fit:'contain'},volume:.4}})}));
 assert.equal(response.status,200);assert.equal(media.snapshot().skins.skirk.mobile.fit,'contain');assert.equal(media.snapshot().skins.skirk.volume,.4);assert.equal(media.snapshot().skins.miku.volume,before.skins.miku.volume);
});
