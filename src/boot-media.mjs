import {mkdir,readFile,writeFile,rename,unlink,readdir,stat,open} from 'node:fs/promises';
import {createReadStream,existsSync} from 'node:fs';
import {Readable} from 'node:stream';
import {join,basename} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {parseRange} from './vendor/video-route.mjs';
export const MAX_VIDEO=96*1024*1024,CHUNK_SIZE=512*1024;
const IDS=['rose','miku'],DEVICES=['desktop','mobile'];
const defaults={enabled:true,sound:true,volume:.65,fit:'cover',maxSeconds:30,file:null,name:null};
const mediaName=/^[a-f0-9]{64}\.(mp4|webm)$/;
const failure=(status,message)=>Object.assign(Error(message),{status});
export async function boundedBody(request,max){
 if(Number(request.headers.get('content-length'))>max)throw failure(413,'文件或分块过大。');
 const reader=request.body?.getReader();if(!reader)return Buffer.alloc(0);
 const chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw failure(413,'文件或分块过大。');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
 return Buffer.concat(chunks);
}
const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store'}});
async function input(request){if(!request.headers.get('content-type')?.startsWith('application/json'))throw failure(415,'需要 JSON 请求。');try{return JSON.parse((await boundedBody(request,8192)).toString());}catch(e){if(e.status)throw e;throw failure(400,'请求格式无效。');}}
function cleanClip(value,fit='cover'){
 const result={fit:['cover','contain'].includes(value?.fit)?value.fit:fit,file:null,name:null};
 if(typeof value?.file==='string'&&mediaName.test(value.file)){result.file=value.file;result.name=String(value.name||'自定义视频').slice(0,120);}
 return result;
}
function cleanSettings(value){
 const result={...defaults,...cleanClip(value)};
 if(value&&typeof value==='object'){
  for(const key of ['enabled','sound'])if(typeof value[key]==='boolean')result[key]=value[key];
  if(typeof value.volume==='number'&&Number.isFinite(value.volume)&&value.volume>=0&&value.volume<=1)result.volume=value.volume;
  if(Number.isInteger(value.maxSeconds)&&value.maxSeconds>=5&&value.maxSeconds<=60)result.maxSeconds=value.maxSeconds;
 }
 result.mobile=cleanClip(value?.mobile,result.fit);
 return result;
}
export async function createMediaStore({directory,resolvePackage}){
 await mkdir(directory,{recursive:true,mode:0o700});
 const settingsFile=join(directory,'settings.json');let state={version:2,revision:0,skins:Object.fromEntries(IDS.map(id=>[id,cleanSettings()]))};
 try{const saved=JSON.parse(await readFile(settingsFile,'utf8'));if(![1,2].includes(saved.version)||!Number.isSafeInteger(saved.revision)||saved.revision<0)throw Error('Invalid media settings');state={version:2,revision:saved.revision,skins:Object.fromEntries(IDS.map(id=>[id,cleanSettings(saved.skins?.[id])]))};}catch(e){if(e.code!=='ENOENT')throw e;}
 for(const file of await readdir(directory))if(/^upload-[a-f0-9]{48}\.tmp$/.test(file))await unlink(join(directory,file)).catch(()=>{});
 // Bundled MP4/WebM are the same clip. Recognize an uploaded copy by its hash,
 // so its compatible source can be served without replacing the user's file.
 const packaged=new Map();
 for(const id of IDS){try{
  const root=resolvePackage(id),mp4=join(root,'media/boot.mp4'),webm=join(root,'media/boot.webm');
  if(existsSync(webm))packaged.set(id,{file:createHash('sha256').update(await readFile(mp4)).digest('hex')+'.mp4',webm});
 }catch{}}
 const compatible=(id,file)=>{
  if(!file)return packaged.get(id)?.webm;
  if(!file.endsWith('.mp4'))return null;
  const sidecar=join(directory,file+'.compat.webm');
  if(existsSync(sidecar))return sidecar;
  return packaged.get(id)?.file===file?packaged.get(id).webm:null;
 };
 const pending=new Map();let tail=Promise.resolve(),closed=false;
 const available=(id,file)=>{try{const root=resolvePackage(id);return existsSync(file?join(directory,file):join(root,'media/boot.mp4'));}catch{return false;}};
 const clipUrl=(id,device,file)=>'./api/ekko-skins/video?skin='+id+'&device='+device+'&file='+(file||'default');
 const fallbackUrl=(id,device,file)=>compatible(id,file)?clipUrl(id,device,file)+'&variant=webm':null;
 const snapshot=()=>({version:2,revision:state.revision,skins:Object.fromEntries(IDS.map(id=>{
  const current=state.skins[id],desktop={...current,available:available(id,current.file),source:current.file?'upload':'default',url:clipUrl(id,'desktop',current.file),fallbackUrl:fallbackUrl(id,'desktop',current.file)};
  const own=current.mobile.file;
  desktop.mobile={...current.mobile,available:available(id,own||current.file),source:own?'upload':'fallback',inherited:!own,url:clipUrl(id,own?'mobile':'desktop',own||current.file),fallbackUrl:fallbackUrl(id,own?'mobile':'desktop',own||current.file)};
  return[id,desktop];
 }))});
 const queue=fn=>{const next=tail.then(fn);tail=next.catch(()=>{});return next;};
 async function commit(skins,revision){
  if(revision!==state.revision)throw failure(409,'设置已在其他页面修改，请刷新后重试。');
  const next={version:2,revision:state.revision+1,skins},temp=settingsFile+'.'+randomBytes(8).toString('hex')+'.tmp';
  try{await writeFile(temp,JSON.stringify(next)+'\n',{mode:0o600,flag:'wx'});await rename(temp,settingsFile);}finally{await unlink(temp).catch(()=>{});}
  state=next;
  const used=new Set(IDS.flatMap(id=>[state.skins[id].file,state.skins[id].mobile.file]));
  for(const file of await readdir(directory)){
   const original=file.endsWith('.mp4.compat.webm')?file.slice(0,-'.compat.webm'.length):file;
   if(mediaName.test(original)&&!used.has(original))await unlink(join(directory,file)).catch(()=>{});
  }
  return snapshot();
 }
 async function discard(id){const item=pending.get(id);if(!item)return;pending.delete(id);await unlink(item.path).catch(()=>{});}
 const sweeper=setInterval(()=>{for(const[id,item]of pending)if(!item.busy&&item.expires<Date.now())void discard(id);},60000);sweeper.unref();
 async function settings(request){
  if(request.method==='GET')return json(snapshot());
  const data=await input(request),device=data.device??'desktop';if(!IDS.includes(data.skin)||!DEVICES.includes(device))throw failure(400,'未知主题或屏幕类型。');
  return queue(async()=>{
   const current=state.skins[data.skin];
   if(!data.patch||typeof data.patch!=='object'||Array.isArray(data.patch))throw failure(400,'无效设置。');
   const keys=Object.keys(data.patch);if(keys.some(k=>!['enabled','sound','volume','fit','maxSeconds','reset','mobile'].includes(k)))throw failure(400,'无效设置项。');
   const updated=cleanSettings({...current,...data.patch,mobile:current.mobile});
   for(const key of keys.filter(k=>!['reset','mobile'].includes(k)))if(updated[key]!==data.patch[key])throw failure(400,'设置值超出范围。');
   if('mobile' in data.patch){
    const mobile=data.patch.mobile;
    if(!mobile||typeof mobile!=='object'||Array.isArray(mobile)||Object.keys(mobile).some(k=>k!=='fit')||!['cover','contain'].includes(mobile.fit))throw failure(400,'手机端画面设置无效。');
    updated.mobile={...current.mobile,fit:mobile.fit};
   }
   if(data.patch.reset===true){if(device==='mobile')updated.mobile={...updated.mobile,file:null,name:null};else{updated.file=null;updated.name=null;}}
   return json(await commit({...state.skins,[data.skin]:updated},data.revision));
  });
 }
 async function upload(request){
  const url=new URL(request.url),id=url.searchParams.get('id'),action=url.searchParams.get('action');
  if(request.method==='POST'&&!id&&!action){
   const data=await input(request),device=data.device??'desktop';
   if(!IDS.includes(data.skin)||!DEVICES.includes(device)||!Number.isSafeInteger(data.size)||data.size<16||data.size>MAX_VIDEO)throw failure(400,'请选择屏幕类型及不超过 96 MiB 的 MP4 或 WebM 视频。');
   const ext=typeof data.name==='string'?/\.(mp4|webm)$/i.exec(data.name)?.[1].toLowerCase():null;
   if(!ext)throw failure(415,'只支持 MP4、WebM 视频。');
   if(data.revision!==state.revision)throw failure(409,'设置已更新，请重试。');
   if(pending.size>=2)throw failure(429,'已有视频正在上传，请稍后再试。');
   const token=randomBytes(24).toString('hex'),path=join(directory,'upload-'+token+'.tmp');
   await writeFile(path,'',{mode:0o600,flag:'wx'});
   pending.set(token,{path,skin:data.skin,device,ext,name:basename(data.name.replaceAll('\\','/')).slice(0,120),size:data.size,received:0,hash:createHash('sha256'),revision:data.revision,expires:Date.now()+600000,busy:false});
   return json({id:token,chunkSize:CHUNK_SIZE});
  }
  if(!/^[a-f0-9]{48}$/.test(id||''))throw failure(404,'上传不存在或已过期。');
  const item=pending.get(id);if(!item||item.expires<Date.now())throw failure(404,'上传不存在或已过期。');
  if(item.busy)throw failure(409,'请等待当前分块完成。');
  item.busy=true;
  try{
   if(action==='cancel'){await input(request);await discard(id);return json({cancelled:true});}
   if(action==='chunk'){
    if(request.headers.get('content-type')!=='application/octet-stream')throw failure(415,'需要视频分块。');
    const offset=Number(url.searchParams.get('offset'));if(!Number.isSafeInteger(offset)||offset!==item.received)throw failure(409,'分块顺序不匹配。');
    const bytes=await boundedBody(request,CHUNK_SIZE);
    if(!bytes.length||item.received+bytes.length>item.size)throw failure(413,'分块大小不匹配。');
    const file=await open(item.path,'a');try{await file.writeFile(bytes);}finally{await file.close();}
    item.hash.update(bytes);item.received+=bytes.length;item.expires=Date.now()+600000;return json({received:item.received});
   }
   if(action==='complete'){
    await input(request);
    if(item.received!==item.size)throw failure(409,'视频尚未上传完整。');
    const file=await open(item.path,'r'),magic=Buffer.alloc(12);try{await file.read(magic,0,12,0);}finally{await file.close();}
    if(item.ext==='mp4'?magic.toString('ascii',4,8)!=='ftyp':magic.readUInt32BE(0)!==0x1a45dfa3){await discard(id);throw failure(415,'视频内容与格式不符。');}
    return await queue(async()=>{
     if(item.revision!==state.revision){await discard(id);throw failure(409,'设置已更新，请重新选择视频。');}
     const name=item.hash.digest('hex')+'.'+item.ext;
     await rename(item.path,join(directory,name));pending.delete(id);
     const current=state.skins[item.skin],clip={file:name,name:item.name};
     const updated=item.device==='mobile'?{...current,mobile:{...current.mobile,...clip}}:{...current,...clip};
     return json(await commit({...state.skins,[item.skin]:updated},item.revision));
    });
   }
   throw failure(405,'不支持的操作。');
  }finally{item.busy=false;}
 }
 async function video(request){
  const url=new URL(request.url),skin=url.searchParams.get('skin'),file=url.searchParams.get('file'),device=url.searchParams.get('device')??'desktop';
  if(!IDS.includes(skin)||!DEVICES.includes(device))throw failure(404,'视频不存在。');
  const current=device==='mobile'?state.skins[skin].mobile:state.skins[skin];
  if(!(file==='default'||mediaName.test(file||'')&&current.file===file))throw failure(404,'视频不存在。');
  const variant=url.searchParams.get('variant');
  if(variant&&variant!=='webm')throw failure(404,'视频不存在。');
  let path;try{path=variant==='webm'?compatible(skin,file==='default'?null:file):(file==='default'?join(resolvePackage(skin),'media/boot.mp4'):join(directory,file));}catch{throw failure(404,'视频不存在。');}
  if(!path)throw failure(404,'此视频没有备用编码。');
  let info;try{info=await stat(path);}catch{throw failure(404,'视频不存在。');}
  const range=parseRange(request.headers.get('range'),info.size),headers={'content-type':variant==='webm'||file?.endsWith('.webm')?'video/webm':'video/mp4','accept-ranges':'bytes','cache-control':'private, no-store','x-content-type-options':'nosniff','cross-origin-resource-policy':'same-origin'};
  if(range==='unsatisfiable')return new Response(null,{status:416,headers:{...headers,'content-range':'bytes */'+info.size}});
  const start=range?.start||0,end=range?.end??info.size-1;headers['content-length']=String(end-start+1);if(range)headers['content-range']=`bytes ${start}-${end}/${info.size}`;
  return new Response(request.method==='HEAD'?null:Readable.toWeb(createReadStream(path,{start,end,signal:request.signal})),{status:range?206:200,headers});
 }
 const safe=fn=>async request=>{try{if(closed)throw failure(503,'主题管理正在重载。');return await fn(request);}catch(e){return json({message:e.status?e.message:'视频操作失败，请检查可用空间后重试。'},e.status||500);}};
 return{settings:safe(settings),upload:safe(upload),video:safe(video),snapshot,async close(){closed=true;clearInterval(sweeper);await tail;for(const id of pending.keys())await discard(id);}};
}
