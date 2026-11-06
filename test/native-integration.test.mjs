import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const runtime=process.env.DSH_MODULES;
test('native owner APIs, streaming upload, range playback and shared host survive removal of either theme',{skip:!runtime,timeout:20000},async t=>{
 const load=name=>import(pathToFileURL(runtime+'/'+name+'/lib/index.js'));
 const [{Context},{default:Credentials},{default:WebServer},connection,miku,rose,compat]=await Promise.all([
  load('cordis'),load('dsh-credentials-local'),load('dsh-host-webserver'),load('dsh-client-connection'),
  import('../../dsh-plugin-miku-theme/lib/index.js'),import('../../dsh-plugin-rose-theme/lib/index.js'),import('../lib/index.js')
 ]);
 const directory=await mkdtemp(join(tmpdir(),'ekko-native-')),ctx=new Context();
 t.after(async()=>{await ctx.fiber.dispose();await rm(directory,{recursive:true,force:true});});
 const mount=async(plugin,config)=>{const fiber=ctx.plugin(plugin,config);await fiber.await();return fiber;};
 await mkdir(join(directory,'node_modules'));
 for(const id of ['miku','rose'])await symlink(resolve('../dsh-plugin-'+id+'-theme'),join(directory,'node_modules/dsh-plugin-'+id+'-theme'),'dir');
 await writeFile(join(directory,'package.json'),'{"private":true}');ctx.provide('profileContext');ctx.set('profileContext',{name:'test',dir:directory});
 await mount(Credentials,{path:join(directory,'credentials.json'),dshHome:directory,watch:false});await mount(WebServer,{host:'127.0.0.1',port:0});await mount(connection,{});
 const a=await mount(miku),b=await mount(rose),c=await mount(compat);
 const shared=ctx.connection.createSharedFetchHandler('/api'),url='http://127.0.0.1:'+ctx.webServer.port;
 for(let i=0;i<100;i++){const r=await shared.fetch(new Request(url+'/api/ekko-skins/boot'),ctx.connection.browserPeer);if(r.status===200)break;await new Promise(r=>setTimeout(r,20));}
 const rows=ctx.webServer.collectIndexInjections(ctx.connection.browserPeer).filter(r=>r.text?.includes('globalThis.__EKKO_STARTUP_CONFIG__='));assert.equal(rows.length,1);
 assert.equal(shared.requestBodyMode({method:'GET',url:new URL(url+'/api/ekko-skins/boot')}),'buffered');assert.equal(shared.requestBodyMode({method:'POST',url:new URL(url+'/api/ekko-skins/upload')}),'streaming');
 assert.equal((await shared.fetch(new Request(url+'/api/ekko-skins/boot'),{principal:{kind:'agent'}})).status,403);
 const {nativeCookie}=await import('/root/.dsh/profiles/web/node_modules/dsh-public-login/lib/server.js');const cookie=await nativeCookie(ctx.credentials,new URL(url).host);
 const call=(path,body,headers={})=>fetch(url+'/api/ekko-skins/'+path,{headers:{cookie,origin:url,...body?{'content-type':'application/json'}:{},...headers},...body?{method:'POST',body:typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body)}:{}});
 assert.equal((await fetch(url+'/api/ekko-skins/boot')).status,401);
 const boot=await(await call('boot')).json();assert.equal(boot.revision,0);
 assert.equal((await call('boot-settings',{skin:'miku',revision:0,patch:{sound:false}},{origin:'https://evil.example'})).status,403);
 const init=await call('upload',{skin:'miku',name:'test.mp4',size:32,revision:0});assert.equal(init.status,200);const{id}=await init.json();
 const bytes=Buffer.alloc(32);bytes.write('ftyp',4);
 assert.equal((await call('upload?action=chunk&id='+id+'&offset=0',bytes,{'content-type':'application/octet-stream'})).status,200);
 assert.equal((await call('upload?action=complete&id='+id,{})).status,200);
 const data=await(await call('boot')).json(),file=data.skins.miku.file;
 const video=await call('video?skin=miku&file='+file,undefined,{range:'bytes=4-7'});assert.equal(video.status,206);assert.equal(await video.text(),'ftyp');
 await a.dispose();assert.equal((await call('boot')).status,200);await c.dispose();assert.equal((await call('boot')).status,200);
 await b.dispose();assert.equal((await shared.fetch(new Request(url+'/api/ekko-skins/boot'),ctx.connection.browserPeer)).status,404);
});
