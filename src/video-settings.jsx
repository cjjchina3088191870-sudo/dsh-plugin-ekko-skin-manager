import React,{useEffect,useRef,useState} from 'react';
import {playBoot,selectBootVideo,MOBILE_SCREEN,videoSources} from './boot-player.mjs';
const API='./api/ekko-skins/',LIMIT=96*1024*1024;
const fields=entry=>Object.fromEntries(['enabled','sound','volume','fit','maxSeconds'].map(k=>[k,entry[k]]));
const draftFrom=entry=>({...fields(entry),mobileFit:entry.mobile?.fit||entry.fit});
async function request(path,options={}){
 const response=await fetch(API+path,{credentials:'same-origin',...options});
 let data;try{data=await response.json();}catch{throw Error(response.status===401?'登录已失效，请刷新后重新登录。':'无法读取视频设置。');}
 if(!response.ok)throw Error(data.message||'视频操作失败。');return data;
}
const jsonBody=data=>({headers:{'content-type':'application/json'},body:JSON.stringify(data)});
function previewError(video){
 const code=video.error?.code;
 if(code===2)return '视频预览加载失败，请检查网络后重试。已保存的视频不会被删除。';
 if(code===3||code===4)return '当前浏览器暂时无法播放此视频。文件仍可上传和保存，可换浏览器预览；若启动时也无法播放，请转换为兼容的 H.264 MP4 或 WebM。';
 return '当前预览不可用，不影响上传和保存视频。';
}
export function VideoSettings({skin}){
 const[data,setData]=useState(null),[draft,setDraft]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[progress,setProgress]=useState(null);
 const[device,setDevice]=useState(()=>window.matchMedia?.(MOBILE_SCREEN).matches?'mobile':'desktop'),[mediaError,setMediaError]=useState(''),[sourceIndex,setSourceIndex]=useState(0);
 const preview=useRef(null),operation=useRef(null),uploadId=useRef(null),alive=useRef(true),input=useRef(null);
 const accept=(value,preserve=false)=>{if(!alive.current)return;setData(value);if(!preserve)setDraft(draftFrom(value.skins[skin]));};
 const load=async()=>{try{accept(await request('boot'));}catch(e){if(alive.current)setMessage(e.message);}};
 const base=data?.skins[skin],entry=selectBootVideo(base,device==='mobile');
 const sources=videoSources(entry,Boolean(document.createElement('video').canPlayType('video/webm; codecs="vp8, opus"'))),source=sources[sourceIndex]||sources[0];
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;operation.current?.abort();if(uploadId.current)void request('upload?action=cancel&id='+uploadId.current,{method:'POST',...jsonBody({})}).catch(()=>{});};},[skin]);
 useEffect(()=>{setSourceIndex(0);setMediaError('');},[entry?.url,entry?.fallbackUrl,device]);
 useEffect(()=>{const video=preview.current;return()=>{if(video){video.pause();video.removeAttribute('src');video.load();}};},[source,device]);
 useEffect(()=>{if(preview.current)preview.current.volume=draft?.volume??.65;},[draft?.volume,source,device]);
 const save=async(reset=false)=>{
  setBusy(true);setMessage('');
  try{
   const patch=reset?{reset:true}:{...fields(draft),mobile:{fit:draft.mobileFit}};
   accept(await request('boot-settings',{method:'POST',...jsonBody({skin,device,revision:data.revision,patch})}),reset);
   setMessage(reset?(device==='mobile'?'手机端已改为沿用电脑端视频。':'电脑端已恢复默认启动视频。'):'启动视频设置已保存。');
  }catch(e){setMessage(e.message);await load();}finally{if(alive.current)setBusy(false);}
 };
 const upload=async file=>{
  if(!file)return;setMessage('');
  if(!/\.(mp4|webm)$/i.test(file.name)||file.size>LIMIT||file.size<16){setMessage('请选择不超过 96 MiB 的 MP4 或 WebM 视频。');return;}
  const controller=new AbortController();operation.current=controller;setBusy(true);setProgress(0);
  try{
   // A local Blob preview is not a codec authority: mobile browsers may deny or
   // delay it. Upload directly; the owner API validates the container and size.
   const start=await request('upload',{method:'POST',signal:controller.signal,...jsonBody({skin,device,size:file.size,name:file.name,revision:data.revision})});uploadId.current=start.id;
   for(let offset=0;offset<file.size;offset+=start.chunkSize){
    const chunk=file.slice(offset,offset+start.chunkSize);
    await request('upload?action=chunk&id='+start.id+'&offset='+offset,{method:'POST',signal:controller.signal,headers:{'content-type':'application/octet-stream'},body:chunk});
    if(alive.current)setProgress(Math.round(Math.min(file.size,offset+chunk.size)/file.size*100));
   }
   const result=await request('upload?action=complete&id='+start.id,{method:'POST',signal:controller.signal,...jsonBody({})});uploadId.current=null;accept(result,true);
   if(alive.current)setMessage((device==='mobile'?'手机端':'电脑端')+'视频已上传并保存，刷新页面时使用。');
  }catch(e){if(alive.current)setMessage(controller.signal.aborted?'已取消上传。':e.message);}
  finally{
   if(uploadId.current){const id=uploadId.current;uploadId.current=null;void request('upload?action=cancel&id='+id,{method:'POST',...jsonBody({})}).catch(()=>{});}
   operation.current=null;if(alive.current){setBusy(false);setProgress(null);if(input.current)input.current.value='';}
  }
 };
 if(!data||!draft)return <section className="ekko-skin-options ekko-video-settings" data-testid="ekko-video-settings"><h3>启动视频</h3><p role="status">{message||'正在读取视频设置…'}</p><button type="button" className="ekko-skin-button" onClick={load}>重试</button></section>;
 const update=patch=>setDraft({...draft,...patch}),fitKey=device==='mobile'?'mobileFit':'fit';
 return <section className="ekko-skin-options ekko-video-settings" data-testid="ekko-video-settings" data-device={device}>
  <div className="ekko-skin-toolbar"><h3>{skin==='skirk'?'丝柯克 · 磷星环轨':skin==='miku'?'初音未来':'玫瑰女王'} · 启动视频</h3><span className="ekko-skin-version">每款主题分别保存</span></div>
  <div className="ekko-video-controls">
   <label className="ekko-skin-option"><span>启用启动视频<small>页面启动时播放，可随时跳过</small></span><input type="checkbox" checked={draft.enabled} disabled={busy} onChange={e=>update({enabled:e.target.checked})}/></label>
   <label className="ekko-skin-option"><span>播放声音<small>浏览器限制自动播放时先静音，点击可开启声音</small></span><input type="checkbox" checked={draft.sound} disabled={busy} onChange={e=>update({sound:e.target.checked})}/></label>
   <label className="ekko-skin-option"><span>音量<small>{Math.round(draft.volume*100)}%</small></span><input type="range" min="0" max="100" value={Math.round(draft.volume*100)} disabled={busy} onChange={e=>update({volume:Number(e.target.value)/100})}/></label>
   <label className="ekko-skin-option"><span>最长播放时间<small>5–60 秒，到时自动进入界面</small></span><input className="ekko-video-seconds" type="number" min="5" max="60" value={draft.maxSeconds} disabled={busy} onChange={e=>update({maxSeconds:Number(e.target.value)})}/></label>
  </div>
  <div className="ekko-video-device-tabs" role="tablist" aria-label="启动视频屏幕类型">
   {['desktop','mobile'].map(value=><button key={value} type="button" role="tab" id={'ekko-video-tab-'+skin+'-'+value} aria-selected={device===value} aria-controls={'ekko-video-panel-'+skin} disabled={busy} className="ekko-skin-button" data-active={device===value} onClick={()=>{setDevice(value);setMessage('');}}>{value==='mobile'?'手机端视频':'电脑端视频'}</button>)}
  </div>
  <div className="ekko-video-device-panel" role="tabpanel" id={'ekko-video-panel-'+skin} aria-labelledby={'ekko-video-tab-'+skin+'-'+device}>
   <p className="ekko-skin-version">{device==='mobile'?'手机及窄屏自动使用此视频，推荐 9:16 竖屏；未上传时沿用电脑端视频。':'电脑及宽屏使用此视频，推荐 16:9 横屏。'}支持其他分辨率与比例。</p>
   <label className="ekko-skin-option"><span>{device==='mobile'?'手机端':'电脑端'}画面显示</span><select aria-label={(device==='mobile'?'手机端':'电脑端')+'画面显示'} value={draft[fitKey]} disabled={busy} onChange={e=>update({[fitKey]:e.target.value})}><option value="cover">铺满屏幕</option><option value="contain">完整显示</option></select></label>
   <video key={device+source} ref={preview} className="ekko-video-preview" data-device={device} muted={!draft.sound} controls playsInline preload="metadata" onLoadedMetadata={()=>setMediaError('')} onError={e=>{if(sourceIndex+1<sources.length){setSourceIndex(sourceIndex+1);setMediaError('正在尝试另一种视频编码…');}else setMediaError(previewError(e.currentTarget));}} src={source} aria-label={(device==='mobile'?'手机端':'电脑端')+'启动视频预览'}/>
   <p className="ekko-video-name">{entry.source==='upload'?entry.name:entry.source==='fallback'?'沿用电脑端视频'+(base.name?' · '+base.name:''):'默认启动视频'}</p>
   {mediaError&&<p className="ekko-video-message" role="status">{mediaError}</p>}
  </div>
  <p className="ekko-skin-version">支持 MP4 / WebM，每个视频最大 96 MiB。电脑端与手机端分别保存，可在当前 DSH 的其他设备上使用。</p>
  <input ref={input} className="ekko-video-file" tabIndex="-1" type="file" accept="video/mp4,video/webm,.mp4,.webm" disabled={busy} aria-label={'上传'+(device==='mobile'?'手机端':'电脑端')+'启动视频'} onChange={e=>void upload(e.target.files?.[0])}/>
  {progress!==null&&<div role="status"><progress max="100" value={progress}/><span> 上传 {progress}%</span><button type="button" className="ekko-skin-button" onClick={()=>operation.current?.abort()}>取消上传</button></div>}
  <div className="ekko-video-actions">
   <button type="button" className="ekko-skin-button" disabled={busy} onClick={()=>input.current?.click()}>上传{device==='mobile'?'手机端':'电脑端'}视频</button>
   <button type="button" className="ekko-skin-button" disabled={busy} onClick={()=>void playBoot(skin,{...entry,...fields(draft),fit:draft[fitKey]},{preview:true})}>预览启动效果</button>
   <button type="button" className="ekko-skin-button" disabled={busy||entry.source!=='upload'} onClick={()=>void save(true)}>{device==='mobile'?'沿用电脑端视频':'恢复默认视频'}</button>
   <button type="button" className="ekko-skin-button" data-active="true" disabled={busy} onClick={()=>void save()}>保存启动设置</button>
  </div>
  <p role="status" className="ekko-video-message">{message}</p>
 </section>;
}
