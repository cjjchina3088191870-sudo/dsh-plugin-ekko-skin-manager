import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createMediaStore} from './boot-media.mjs';
import {BOOT_SCRIPT} from './boot-generated.mjs';
import {toInlineJson} from './vendor/video-route.mjs';
const require=createRequire(import.meta.url);
export const PREFIX='/ekko-skins';
const PACKAGES={rose:'dsh-plugin-rose-theme',miku:'dsh-plugin-miku-theme'};
export function createHandler({resolvePackage=name=>dirname(require.resolve(name+'/package.json')),defaultSkin='miku'}={}){
 async function catalog(){
  const skins=[];for(const[id,pkg]of Object.entries(PACKAGES)){
   try{const root=resolvePackage(pkg),meta=JSON.parse(await readFile(join(root,'package.json'),'utf8'));skins.push({id,version:meta.version,available:meta.dsh?.ekkoSkinProvider===1,preview:{light:'./ekko-skins/preview/'+id+'/light.webp',dark:'./ekko-skins/preview/'+id+'/dark.webp'}});}catch{skins.push({id,available:false});}
  }
  const installed=skins.filter(s=>s.available).map(s=>s.id);
  const preferred=['rose','miku','default'].includes(defaultSkin)?defaultSkin:'miku';
  const selected=preferred==='default'||installed.includes(preferred)?preferred:(installed[0]||'default');
  return{version:'0.2.1',defaultSkin:selected,skins};
 }
 return async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
  const pathname=new URL(req.url||'/','http://localhost').pathname;
  if(pathname===PREFIX+'/catalog'){
   const bytes=Buffer.from(JSON.stringify(await catalog()));res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','Content-Length':bytes.length,'X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);return;
  }
  const match=/^\/ekko-skins\/(assets|preview)\/(rose|miku)\/([a-z0-9.-]+)$/.exec(pathname);
  if(!match){res.writeHead(404).end();return;}
  const[,kind,id,file]=match;let bytes;
  try{
   const root=resolvePackage(PACKAGES[id]);
   if(kind==='assets'){
    if(!/^[a-f0-9]{64}\.(webp|png|svg|woff2)$/.test(file)){res.writeHead(404).end();return;}
    // Read the current allowlist so updating artwork does not need a host restart.
    const manifest=JSON.parse(await readFile(join(root,'assets/manifest.json'),'utf8'));
    if(!Object.values(manifest).includes(file)){res.writeHead(404).end();return;}
    bytes=await readFile(join(root,'assets/runtime',file));
   }else{
    if(!['light.webp','dark.webp'].includes(file)){res.writeHead(404).end();return;}
    bytes=await readFile(join(root,'preview',file));
   }
  }catch{res.writeHead(404).end();return;}
  const etag='"'+createHash('sha256').update(bytes).digest('hex')+'"';
  const type=file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':file.endsWith('.woff2')?'font/woff2':'image/webp';
  const headers={'Content-Type':type,'Cache-Control':kind==='assets'?'public, max-age=31536000, immutable':'no-cache',ETag:etag,'X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'};
  if(req.headers['if-none-match']===etag){res.writeHead(304,headers).end();return;}
  res.writeHead(200,{...headers,'Content-Length':bytes.length});res.end(req.method==='HEAD'?undefined:bytes);
 };
}
export function apply(ctx,config={}){
 // Register synchronously: Desktop collects index contributions once at startup.
 // Inline code is fail-open and cannot reject DSH's native script loading promise.
 ctx.on('webserver/index-inject',table=>table.push({kind:'script',placement:'body',text:'globalThis.__EKKO_STARTUP_CONFIG__='+toInlineJson({defaultSkin:config.defaultSkin||'miku'})+';\n'+BOOT_SCRIPT}));
 ctx.inject(['webServer','profileContext','connection'],async child=>{
  const profile=child.get('profileContext'),resolver=createRequire(pathToFileURL(join(profile.dir,'package.json')));
  const resolvePackage=name=>dirname(resolver.resolve(name+'/package.json'));
  const media=await createMediaStore({directory:join(profile.dir,'ekko-skins-media'),resolvePackage:id=>resolvePackage(PACKAGES[id])});
  child.effect(()=>()=>media.close(),'ekko-skins: private media store');
  child.effect(()=>child.get('webServer').register({kind:'prefix',path:PREFIX,handler:createHandler({defaultSkin:config.defaultSkin,resolvePackage})}));
  for(const [path,methods,fetch,requestBody]of [
   ['/api/ekko-skins/boot',['GET'],media.settings,'buffered'],
   ['/api/ekko-skins/boot-settings',['POST'],media.settings,'streaming'],
   ['/api/ekko-skins/upload',['POST'],media.upload,'streaming'],
   ['/api/ekko-skins/video',['GET','HEAD'],media.video,'buffered']
  ])child.effect(()=>child.get('connection').fetch.register({path,methods,requestBody,fetch}));
 });
}
