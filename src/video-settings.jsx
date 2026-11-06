import React,{useEffect,useRef,useState} from 'react';
import {playBoot} from './boot-player.mjs';
const API='./api/ekko-skins/',LIMIT=96*1024*1024;
const fields=entry=>Object.fromEntries(['enabled','sound','volume','fit','maxSeconds'].map(k=>[k,entry[k]]));
async function request(path,options={}){
 const response=await fetch(API+path,{credentials:'same-origin',...options});
 let data;try{data=await response.json();}catch{throw Error(response.status===401?'登录已失效，请刷新后重新登录。':'无法读取视频设置。');}
 if(!response.ok)throw Error(data.message||'视频操作失败。');return data;
}
const jsonBody=data=>({headers:{'content-type':'application/json'},body:JSON.stringify(data)});
function checkVideo(file,signal){
 return new Promise((resolve,reject)=>{
  const video=document.createElement('video'),url=URL.createObjectURL(file);
  const cleanup=()=>{video.onloadedmetadata=video.onerror=null;clearTimeout(timer);signal.removeEventListener('abort',abort);video.removeAttribute('src');video.load();URL.revokeObjectURL(url);};
  const fail=()=>{cleanup();reject(Error('浏览器无法解码此视频，请使用兼容的 MP4（H.264）或 WebM。'));};
  const abort=()=>{cleanup();reject(Error('已取消上传。'));};
  const timer=setTimeout(fail,10000);signal.addEventListener('abort',abort,{once:true});
  video.onloadedmetadata=()=>{if(!video.videoWidth||!video.videoHeight)return fail();cleanup();resolve();};video.onerror=fail;video.preload='metadata';video.src=url;
 });
}
export function VideoSettings({skin}){
 const[data,setData]=useState(null),[draft,setDraft]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[progress,setProgress]=useState(null);
 const preview=useRef(null),operation=useRef(null),uploadId=useRef(null),alive=useRef(true),input=useRef(null);
 const accept=(value,preserve=false)=>{if(!alive.current)return;setData(value);if(!preserve)setDraft(fields(value.skins[skin]));};
 const load=async()=>{try{accept(await request('boot'));}catch(e){if(alive.current)setMessage(e.message);}};
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;operation.current?.abort();if(uploadId.current)void request('upload?action=cancel&id='+uploadId.current,{method:'POST',...jsonBody({})}).catch(()=>{});};},[skin]);
 useEffect(()=>{const video=preview.current;return()=>{if(video){video.pause();video.removeAttribute('src');video.load();}};},[Boolean(data)]);
 useEffect(()=>{if(preview.current)preview.current.volume=draft?.volume??.65;},[draft?.volume,Boolean(data)]);
 const save=async(reset=false)=>{
  setBusy(true);setMessage('');
  try{accept(await request('boot-settings',{method:'POST',...jsonBody({skin,revision:data.revision,patch:reset?{reset:true}:draft})}),reset);setMessage(reset?'已恢复默认启动视频。':'启动视频设置已保存。');}
  catch(e){setMessage(e.message);await load();}finally{if(alive.current)setBusy(false);}
 };
 const upload=async file=>{
  if(!file)return;setMessage('');
  if(!/\.(mp4|webm)$/i.test(file.name)||file.size>LIMIT||file.size<16){setMessage('请选择不超过 96 MiB 的 MP4 或 WebM 视频。');return;}
  const controller=new AbortController();operation.current=controller;setBusy(true);setProgress(0);
  try{
   await checkVideo(file,controller.signal);
   const start=await request('upload',{method:'POST',signal:controller.signal,...jsonBody({skin,size:file.size,name:file.name,revision:data.revision})});uploadId.current=start.id;
   for(let offset=0;offset<file.size;offset+=start.chunkSize){
    const chunk=file.slice(offset,offset+start.chunkSize);
    await request('upload?action=chunk&id='+start.id+'&offset='+offset,{method:'POST',signal:controller.signal,headers:{'content-type':'application/octet-stream'},body:chunk});
    if(alive.current)setProgress(Math.round(Math.min(file.size,offset+chunk.size)/file.size*100));
   }
   const result=await request('upload?action=complete&id='+start.id,{method:'POST',signal:controller.signal,...jsonBody({})});uploadId.current=null;accept(result,true);if(alive.current)setMessage('视频已上传并保存，刷新页面时使用。');
  }catch(e){if(alive.current)setMessage(controller.signal.aborted?'已取消上传。':e.message);}
  finally{
   if(uploadId.current){const id=uploadId.current;uploadId.current=null;void request('upload?action=cancel&id='+id,{method:'POST',...jsonBody({})}).catch(()=>{});}
   operation.current=null;if(alive.current){setBusy(false);setProgress(null);if(input.current)input.current.value='';}
  }
 };
 if(!data||!draft)return <section className="ekko-skin-options ekko-video-settings" data-testid="ekko-video-settings"><h3>启动视频</h3><p role="status">{message||'正在读取视频设置…'}</p><button type="button" className="ekko-skin-button" onClick={load}>重试</button></section>;
 const entry=data.skins[skin],update=patch=>setDraft({...draft,...patch});
 return <section className="ekko-skin-options ekko-video-settings" data-testid="ekko-video-settings">
  <div className="ekko-skin-toolbar"><h3>{skin==='miku'?'初音未来':'有菜玫瑰'} · 启动视频</h3><span className="ekko-skin-version">每款主题分别保存</span></div>
  <div className="ekko-video-controls">
  <label className="ekko-skin-option"><span>启用启动视频<small>页面启动时播放，可随时跳过</small></span><input type="checkbox" checked={draft.enabled} disabled={busy} onChange={e=>update({enabled:e.target.checked})}/></label>
  <label className="ekko-skin-option"><span>播放声音<small>浏览器限制自动播放时先静音，点击可开启声音</small></span><input type="checkbox" checked={draft.sound} disabled={busy} onChange={e=>update({sound:e.target.checked})}/></label>
  <label className="ekko-skin-option"><span>音量<small>{Math.round(draft.volume*100)}%</small></span><input type="range" min="0" max="100" value={Math.round(draft.volume*100)} disabled={busy} onChange={e=>update({volume:Number(e.target.value)/100})}/></label>
  <label className="ekko-skin-option"><span>视频画面</span><select value={draft.fit} disabled={busy} onChange={e=>update({fit:e.target.value})}><option value="cover">铺满屏幕</option><option value="contain">完整显示</option></select></label>
  <label className="ekko-skin-option"><span>最长播放时间<small>5–60 秒，到时自动进入界面</small></span><input className="ekko-video-seconds" type="number" min="5" max="60" value={draft.maxSeconds} disabled={busy} onChange={e=>update({maxSeconds:Number(e.target.value)})}/></label>
  </div>
  <video ref={preview} className="ekko-video-preview" muted={!draft.sound} controls playsInline preload="metadata" onLoadedMetadata={e=>{const video=e.currentTarget;if(Number.isFinite(video.duration)&&video.duration>0&&video.currentTime===0)video.currentTime=Math.min(.8,video.duration*.1);}} src={entry.url} aria-label="当前启动视频"/>
  <p className="ekko-video-name">{entry.source==='upload'?entry.name:'默认启动视频'}</p>
  <p className="ekko-skin-version">支持 MP4 / WebM，最大 96 MiB。上传后在当前 DSH 的其他设备上也可使用。</p>
  <input ref={input} className="ekko-video-file" tabIndex="-1" type="file" accept="video/mp4,video/webm,.mp4,.webm" disabled={busy} aria-label="上传启动视频" onChange={e=>void upload(e.target.files?.[0])}/>
  {progress!==null&&<div role="status"><progress max="100" value={progress}/><span> 上传 {progress}%</span><button type="button" className="ekko-skin-button" onClick={()=>operation.current?.abort()}>取消上传</button></div>}
  <div className="ekko-video-actions">
   <button type="button" className="ekko-skin-button" disabled={busy} onClick={()=>input.current?.click()}>上传自定义视频</button>
   <button type="button" className="ekko-skin-button" disabled={busy} onClick={()=>void playBoot(skin,{...entry,...draft},{preview:true})}>预览启动效果</button>
   <button type="button" className="ekko-skin-button" disabled={busy||entry.source==='default'} onClick={()=>void save(true)}>恢复默认视频</button>
   <button type="button" className="ekko-skin-button" data-active="true" disabled={busy} onClick={()=>void save()}>保存启动设置</button>
  </div>
  <p role="status" className="ekko-video-message">{message}</p>
 </section>;
}
