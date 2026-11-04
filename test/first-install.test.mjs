import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHandler} from '../src/index.mjs';
import {createController,SELECTION_KEY} from '../src/controller.mjs';

test('catalog selects an installed skin and supports manager-only installation',async t=>{
 const root=await mkdtemp(join(tmpdir(),'ekko-first-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const catalog=async defaultSkin=>{
  let data;const handler=createHandler({defaultSkin,resolvePackage:n=>join(root,n)});
  await handler({method:'GET',url:'/ekko-skins/catalog'},{writeHead(){return this},end(bytes){data=JSON.parse(bytes)}});return data;
 };
 assert.equal((await catalog('miku')).defaultSkin,'default');
 const install=async id=>{const p=join(root,'dsh-plugin-'+id+'-theme');await mkdir(p,{recursive:true});await writeFile(join(p,'package.json'),JSON.stringify({version:'0.2.3',dsh:{ekkoSkinProvider:1}}));};
 await install('miku');assert.equal((await catalog('rose')).defaultSkin,'miku');assert.equal((await catalog('miku')).skins.find(s=>s.id==='rose').available,false);
 await install('rose');assert.equal((await catalog('rose')).defaultSkin,'rose');assert.equal((await catalog('default')).defaultSkin,'default');
});

test('only-Miku users recover an absent saved selection without losing explicit native appearance',async()=>{
 for(const saved of ['rose','default',null]){
  const map=new Map(saved?[[SELECTION_KEY,JSON.stringify({version:1,skin:saved})]]:[]),active=new Set();
  const c=createController({storage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},mount(p){active.add(p.id);return{ready:async()=>{},dispose:async()=>active.delete(p.id)}}});
  c.register({id:'miku',plugin:{apply(){}},assets:{}});await c.initialize('miku',['miku']);
  assert.equal(c.getSnapshot().busy,false);assert.equal(c.getSnapshot().selected,saved==='default'?'default':'miku');await c.dispose();
 }
});

test('first install waits for an installed provider, but a manager without skins remains usable',async()=>{
 const storage={getItem:()=>null,setItem(){}},mount=()=>({ready:async()=>{},dispose:async()=>{}});
 const c=createController({storage,mount});await c.initialize('miku',['miku']);assert.equal(c.getSnapshot().busy,true);
 c.register({id:'miku',plugin:{apply(){}},assets:{}});await c.settled();assert.equal(c.getSnapshot().selected,'miku');assert.equal(c.getSnapshot().busy,false);await c.dispose();
 const empty=createController({storage,mount});await empty.initialize('default',[]);assert.equal(empty.getSnapshot().selected,'default');assert.equal(empty.getSnapshot().busy,false);await empty.dispose();
});
