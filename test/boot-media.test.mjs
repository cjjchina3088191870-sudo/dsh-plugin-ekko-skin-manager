import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,stat,readdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {createMediaStore,CHUNK_SIZE,MAX_VIDEO} from '../src/boot-media.mjs';
const clip=size=>{const bytes=Buffer.alloc(size,1);bytes.write('ftyp',4);return bytes;};
async function fixture(t){
 const directory=await mkdtemp(join(tmpdir(),'ekko-media-')),pkg=join(directory,'pkg');await mkdir(join(pkg,'media'),{recursive:true});await writeFile(join(pkg,'media/boot.mp4'),clip(64));
 const options={directory:join(directory,'private'),resolvePackage:()=>pkg};let store=await createMediaStore(options);
 t.after(async()=>{await store.close();await rm(directory,{recursive:true,force:true});});
 const call=(handler,path,data,options={})=>store[handler](new Request('http://localhost/api/ekko-skins/'+path,{method:data!==undefined?'POST':'GET',...data!==undefined?{headers:{'content-type':'application/json'},body:JSON.stringify(data)}:{},...options}));
 return{options,directory,get store(){return store;},call,async reopen(){await store.close();store=await createMediaStore(options);},async upload(skin,bytes,revision=store.snapshot().revision,device='desktop'){
  const started=await call('upload','upload',{skin,device,size:bytes.length,name:'私人视频.mp4',revision});assert.equal(started.status,200);const{id}=await started.json();
  for(let offset=0;offset<bytes.length;offset+=CHUNK_SIZE){const r=await call('upload',`upload?action=chunk&id=${id}&offset=${offset}`,undefined,{method:'POST',headers:{'content-type':'application/octet-stream'},body:bytes.subarray(offset,offset+CHUNK_SIZE)});assert.equal(r.status,200);}
  return call('upload','upload?action=complete&id='+id,{});
 }};
}
test('chunked upload persists per theme, keeps private files, supports Range and safely resets',async t=>{
 const f=await fixture(t),bytes=clip(CHUNK_SIZE+2000),response=await f.upload('miku',bytes);assert.equal(response.status,200);
 const saved=await response.json(),file=saved.skins.miku.file;assert.equal(file,createHash('sha256').update(bytes).digest('hex')+'.mp4');assert.equal(saved.skins.rose.source,'default');
 assert.equal((await stat(join(f.options.directory,file))).mode&0o777,0o600);assert.equal((await stat(join(f.options.directory,'settings.json'))).mode&0o777,0o600);
 await f.reopen();assert.equal(f.store.snapshot().skins.miku.file,file);
 const url='video?skin=miku&file='+file;
 const range=await f.call('video',url,undefined,{headers:{range:'bytes=4-7'}});assert.equal(range.status,206);assert.equal(await range.text(),'ftyp');assert.equal(range.headers.get('content-range'),`bytes 4-7/${bytes.length}`);
 const suffix=await f.call('video',url,undefined,{headers:{range:'bytes=-5'}});assert.equal((await suffix.arrayBuffer()).byteLength,5);
 assert.equal((await f.call('video',url,undefined,{headers:{range:'bytes=999999999-'}})).status,416);
 assert.equal((await f.call('video',url,undefined,{method:'HEAD'})).headers.get('content-length'),String(bytes.length));
 const changed=await f.call('settings','boot',{skin:'rose',revision:saved.revision,patch:{enabled:false,volume:.2}});assert.equal(changed.status,200);assert.equal(f.store.snapshot().skins.miku.enabled,true);
 assert.equal((await f.call('settings','boot',{skin:'miku',revision:saved.revision,patch:{sound:false}})).status,409);
 await f.reopen();assert.equal(f.store.snapshot().skins.rose.enabled,false);
 const reset=await f.call('settings','boot',{skin:'miku',revision:f.store.snapshot().revision,patch:{reset:true}});assert.equal(reset.status,200);assert.equal(f.store.snapshot().skins.miku.source,'default');
 assert.equal((await f.call('video',url)).status,404);await assert.rejects(stat(join(f.options.directory,file)),/ENOENT/);
 assert.equal((await f.call('video','video?skin=miku&file=default')).status,200);
});
test('rejects oversized, out-of-order, disguised and traversal uploads without replacing a working video',async t=>{
 const f=await fixture(t);await f.upload('rose',clip(32));const current=f.store.snapshot(),revision=current.revision;
 assert.equal((await f.call('upload','upload',{skin:'rose',name:'a.mp4',size:MAX_VIDEO+1,revision})).status,400);
 assert.equal((await f.call('upload','upload',{skin:'rose',name:'a.html',size:32,revision})).status,415);
 const start=await(await f.call('upload','upload',{skin:'rose',name:'a.mp4',size:32,revision})).json();
 assert.equal((await f.call('upload','upload?action=chunk&id='+start.id+'&offset=9',undefined,{method:'POST',headers:{'content-type':'application/octet-stream'},body:clip(16)})).status,409);
 assert.equal((await f.call('upload','upload?action=chunk&id='+start.id+'&offset=0',undefined,{method:'POST',headers:{'content-type':'application/octet-stream'},body:Buffer.alloc(CHUNK_SIZE+1)})).status,413);
 const fake=await f.upload('miku',Buffer.alloc(32));assert.equal(fake.status,415);assert.equal(f.store.snapshot().skins.rose.file,current.skins.rose.file);
 assert.equal((await f.call('video','video?skin=rose&file=../../settings.json')).status,404);
 assert.equal((await f.call('upload','upload?action=cancel&id=../../settings.json',{})).status,404);
 assert.equal((await f.call('settings','boot',{skin:'rose',revision,patch:{volume:9}})).status,400);
 assert.equal((await f.call('upload','upload?action=cancel&id='+start.id,{})).status,200);
 assert.equal((await readdir(f.options.directory)).filter(n=>n.startsWith('upload-')).length,0);
});


test('desktop and mobile clips stay independent, share hashed files safely, and reset only the selected screen',async t=>{
 const f=await fixture(t),desktop=clip(40),portrait=clip(48);
 await f.upload('miku',desktop);
 let saved=f.store.snapshot();assert.equal(saved.skins.miku.mobile.source,'fallback');assert.equal(saved.skins.miku.mobile.url,saved.skins.miku.url);
 const desktopFile=saved.skins.miku.file;
 await f.upload('miku',portrait,saved.revision,'mobile');
 saved=f.store.snapshot();const mobileFile=saved.skins.miku.mobile.file;
 assert.notEqual(mobileFile,desktopFile);assert.equal(saved.skins.miku.file,desktopFile);assert.equal(saved.skins.miku.mobile.source,'upload');assert.equal(saved.skins.rose.mobile.source,'fallback');
 const phone=await f.call('video','video?skin=miku&device=mobile&file='+mobileFile,undefined,{headers:{range:'bytes=4-7'}});assert.equal(phone.status,206);assert.equal(await phone.text(),'ftyp');
 assert.equal((await f.call('video','video?skin=miku&file='+mobileFile)).status,404);
 const changed=await f.call('settings','boot',{skin:'miku',revision:saved.revision,patch:{fit:'contain',mobile:{fit:'cover'},volume:.3}});assert.equal(changed.status,200);
 await f.reopen();saved=f.store.snapshot();assert.equal(saved.version,2);assert.equal(saved.skins.miku.fit,'contain');assert.equal(saved.skins.miku.mobile.fit,'cover');assert.equal(saved.skins.miku.mobile.file,mobileFile);
 const reset=await f.call('settings','boot',{skin:'miku',device:'mobile',revision:saved.revision,patch:{reset:true}});assert.equal(reset.status,200);
 saved=f.store.snapshot();assert.equal(saved.skins.miku.file,desktopFile);assert.equal(saved.skins.miku.mobile.source,'fallback');assert.equal(saved.skins.miku.mobile.url,saved.skins.miku.url);
 await assert.rejects(stat(join(f.options.directory,mobileFile)),/ENOENT/);assert.ok(await stat(join(f.options.directory,desktopFile)));
 await f.upload('miku',desktop,saved.revision,'mobile');saved=f.store.snapshot();assert.equal(saved.skins.miku.mobile.file,desktopFile);
 assert.equal((await f.call('settings','boot',{skin:'miku',revision:saved.revision,patch:{reset:true}})).status,200);
 assert.ok(await stat(join(f.options.directory,desktopFile)));assert.equal(f.store.snapshot().skins.miku.source,'default');assert.equal(f.store.snapshot().skins.miku.mobile.source,'upload');
 assert.equal((await f.call('settings','boot',{skin:'miku',revision:f.store.snapshot().revision,patch:{mobile:{fit:'stretch'}}})).status,400);
 assert.equal((await f.call('upload','upload',{skin:'miku',device:'other',name:'a.mp4',size:32,revision:f.store.snapshot().revision})).status,400);
});

test('upgrading version 1 preserves the saved clip, revision, sound, fit and phone fallback',async t=>{
 const f=await fixture(t);await f.upload('rose',clip(36));const before=f.store.snapshot();
 const settings=JSON.parse(await readFile(join(f.options.directory,'settings.json'),'utf8'));settings.version=1;
 for(const id of ['miku','rose'])delete settings.skins[id].mobile;
 settings.skins.rose.fit='contain';settings.skins.rose.sound=false;settings.skins.rose.volume=.25;
 await writeFile(join(f.options.directory,'settings.json'),JSON.stringify(settings));
 await f.reopen();const after=f.store.snapshot();assert.equal(after.version,2);assert.equal(after.revision,before.revision);assert.equal(after.skins.rose.file,before.skins.rose.file);assert.equal(after.skins.rose.sound,false);assert.equal(after.skins.rose.volume,.25);assert.equal(after.skins.rose.mobile.fit,'contain');assert.equal(after.skins.rose.mobile.url,after.skins.rose.url);
});
