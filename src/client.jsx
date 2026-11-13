import React,{useEffect,useSyncExternalStore}from'react';
import {VideoSettings} from './video-settings.jsx';
import{createController,readSelection,SELECTION_KEY}from'./controller.mjs';
import{STYLES}from'./generated.mjs';
import{createMobileNavigation}from'./mobile-navigation.mjs';
export const inject=['slots','theme','layout'];
const NAMES={rose:{zh:'玫瑰女王',en:'Rose Queen'},miku:{zh:'初音未来',en:'Hatsune Miku'},skirk:{zh:'丝柯克 · 磷星环轨',en:'Skirk · Stellar Orbit'}};
const COPY={
 zh:{nav:'Ekko 皮肤',title:'Ekko 创作空间',intro:'选择你的创作空间；每个主题的装饰偏好分别保留。',use:'使用',active:'当前使用',switching:'正在切换…',native:'原生界面',options:'主题装饰',artwork:'欢迎页装饰',companion:'对话人物背景',polaroid:'右下角照片',opacity:'对话背景浓度',reset:'恢复此主题默认',loading:'正在加载主题…',unavailable:'可选主题，尚未安装',retry:'重试',loadFailed:'皮肤管理器暂时无法加载，请重试。',materialFailed:'主题素材未能加载，请重试。'},
 en:{nav:'Ekko skins',title:'Ekko creative spaces',intro:'Choose your creative space. Each skin keeps its own appearance preferences.',use:'Use',active:'In use',switching:'Switching…',native:'Native appearance',options:'Artwork preferences',artwork:'Welcome artwork',companion:'Chat character background',polaroid:'Corner photo',opacity:'Chat background opacity',reset:'Reset this skin',loading:'Loading skins…',unavailable:'Optional skin, not installed',retry:'Retry',loadFailed:'Unable to load the skin manager. Please retry.',materialFailed:'Unable to load the skin artwork. Please retry.'}
};
const language=()=>/^zh/i.test(document.documentElement.lang||navigator.language)?'zh':'en';
export function apply(ctx){
 const storage=window.localStorage,imageCache=new Map();let alive=true,catalog=null,loadError=null,view,preferenceRevision=0,initialized=false;
 const navigation=createMobileNavigation({layout:ctx.get('layout')});
 const listeners=new Set();
 const prepare=provider=>Promise.all([...new Set(Object.values(provider.assets))].filter(url=>!url.startsWith('data:')).map(url=>{
  if(!imageCache.has(url))imageCache.set(url,new Promise((resolve,reject)=>{
   const img=new Image(),timer=setTimeout(()=>{img.onload=img.onerror=null;reject(Error(COPY[language()].materialFailed));},12000);
   img.onload=()=>{clearTimeout(timer);resolve();};img.onerror=()=>{clearTimeout(timer);reject(Error(COPY[language()].materialFailed));};img.src=url;
  }).catch(error=>{imageCache.delete(url);throw error;}));return imageCache.get(url);
 }));
 const controller=createController({storage,prepare,mount(provider){const fiber=ctx.plugin(provider.plugin);return{ready:()=>fiber.await(),dispose:()=>fiber.dispose()};}});
 const refresh=()=>{const presentation=controller.getSnapshot(),provider=controller.provider(presentation.selected);navigation.update(provider?{skin:provider.id,mode:provider.readSettings(storage).mobileNav,mark:provider.assets.mark||provider.assets.rose}:null);view={catalog,error:loadError,presentation,preferenceRevision};for(const fn of listeners)fn();};
 const unsubscribe=controller.subscribe(refresh);refresh();
 ctx.provide('ekkoSkins',controller);
 const style=document.createElement('style');style.dataset.ekkoSkinManager='';style.textContent=STYLES;document.head.append(style);
 async function load(){
  loadError=null;refresh();
  try{const response=await fetch('./ekko-skins/catalog',{credentials:'same-origin'});if(!response.ok)throw Error('catalog');const result=await response.json();if(!Array.isArray(result.skins))throw Error('catalog');if(!alive)return;catalog=result;refresh();if(!initialized){initialized=true;await controller.initialize(result.defaultSkin,result.skins.filter(s=>s.available).map(s=>s.id));}else{const current=controller.getSnapshot().desired;if(current!=='default'&&!result.skins.some(s=>s.id===current&&s.available))await controller.choose(result.defaultSkin);}}
  catch{if(alive){loadError=COPY[language()].loadFailed;refresh();}}
 }
 function setPreference(id,patch){
  const provider=controller.provider(id);if(!provider)return;
  const value={...provider.normalizeSettings({...provider.readSettings(storage),...patch}),enabled:true};
  let oldValue;try{oldValue=storage.getItem(provider.storageKey);storage.setItem(provider.storageKey,JSON.stringify(value));}catch{}
  window.dispatchEvent(new StorageEvent('storage',{key:provider.storageKey,newValue:JSON.stringify(value),oldValue:oldValue||null,storageArea:storage}));
  preferenceRevision++;refresh();
 }
 const subscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn);};
 function Panel(){
  useEffect(()=>{if(innerWidth>640)return;const frame=requestAnimationFrame(()=>document.querySelector("[role='dialog'] [class*='_navList'] [class*='_active']")?.scrollIntoView({block:'nearest',inline:'nearest'}));return()=>cancelAnimationFrame(frame);},[]);
  const state=useSyncExternalStore(subscribe,()=>view),lang=language(),c=COPY[lang],p=state.presentation;
  const id=p.selected,provider=controller.provider(id),prefs=provider?provider.readSettings(storage):null;
  const choose=target=>{void controller.choose(target);};
  return <section className="ekko-skins" data-ekko-skin-manager="" aria-label={c.nav}>
   <header className="ekko-skins-intro"><h2>{c.title}</h2><p>{c.intro}</p></header>
   {state.error&&<div className="ekko-skin-error" role="alert">{state.error} <button type="button" className="ekko-skin-button" onClick={load}>{c.retry}</button></div>}
   {!state.catalog&&!state.error&&<p role="status">{c.loading}</p>}
   <div className="ekko-skin-grid">{['rose','miku','skirk'].map(skin=>{
    const entry=state.catalog?.skins.find(s=>s.id===skin),name=NAMES[skin][lang],active=id===skin,available=entry?.available&&p.available.includes(skin);
    return <article key={skin} className="ekko-skin-card" data-active={active}>
     {entry?.preview&&<img className="ekko-skin-cover" src={entry.preview[document.body.hasAttribute('data-ds-dark-theme')?'dark':'light']} alt={name} loading="lazy"/>}
     <div className="ekko-skin-description"><div className="ekko-skin-title"><h3>{name}</h3>{active&&<span className="ekko-skin-state">{c.active}</span>}</div>
      <span className="ekko-skin-version">{entry?.version?'v'+entry.version:c.unavailable}</span>
      <button type="button" className="ekko-skin-button" data-active={active} disabled={!available||active||p.busy} onClick={()=>choose(skin)}>{p.busy&&p.desired===skin?c.switching:(active?c.active:c.use+' '+name)}</button>
     </div>
    </article>;
   })}</div>
   <div className="ekko-skin-toolbar"><span>{p.busy?c.switching:(id==='default'?c.native:NAMES[id]?.[lang])}</span><button type="button" className="ekko-skin-button" disabled={id==='default'||p.busy} onClick={()=>choose('default')}>{c.native}</button></div>
   {p.error&&<div className="ekko-skin-error" role="alert">{p.error}<button type="button" className="ekko-skin-button" onClick={()=>choose(p.desired)}>{c.retry}</button></div>}
   {prefs&&<div className="ekko-skin-options"><div className="ekko-skin-toolbar"><h3>{NAMES[id][lang]} · {c.options}</h3><button type="button" className="ekko-skin-button" disabled={p.busy} onClick={()=>setPreference(id,provider.defaults||{artwork:true,companion:true,polaroid:true,opacity:.12,mobileNav:'corner'})}>{c.reset}</button></div>
    <label className="ekko-skin-option"><span>{lang==='zh'?'手机导航方式':'Phone navigation'}<small>{lang==='zh'?'竖屏手机生效，各主题分别保存':'Portrait phones; saved separately for each skin'}</small></span><select aria-label={lang==='zh'?'手机导航方式':'Phone navigation'} value={prefs.mobileNav||'corner'} disabled={p.busy} onChange={e=>setPreference(id,{mobileNav:e.target.value})}><option value="corner">{lang==='zh'?'左上角按钮 + 抽屉':'Corner button + drawer'}</option><option value="rail">{lang==='zh'?'左侧纵向图标栏':'Vertical icon rail'}</option></select></label>
    {['artwork','companion',...(id==='skirk'?[]:['polaroid'])].map(key=><label className="ekko-skin-option" key={key}><span>{c[key]}</span><input type="checkbox" checked={prefs[key]} disabled={p.busy} onChange={e=>setPreference(id,{[key]:e.target.checked})}/></label>)}
    <label className="ekko-skin-option"><span>{c.opacity}<small>{Math.round(prefs.opacity*100)}%</small></span><input type="range" min=".04" max=".24" step=".01" value={prefs.opacity} disabled={p.busy} onChange={e=>setPreference(id,{opacity:Number(e.target.value)})}/></label>
   </div>}
   {prefs&&<VideoSettings key={id} skin={id}/>}
  </section>;
 }
 function registerSection(){return ctx.slots.inject('settings.section',()=>ctx.slots.register({name:'settings.section',id:'ekko-skins',order:115,label:()=>COPY[language()].nav},Panel));}
 let section=registerSection();
 const locale=new MutationObserver(()=>{section?.();section=registerSection();refresh();});locale.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 const appearance=new MutationObserver(refresh);appearance.observe(document.body,{attributes:true,attributeFilter:['data-ds-dark-theme']});
 const onStorage=e=>{if(e.key===SELECTION_KEY)void controller.choose(readSelection(storage,catalog?.defaultSkin),{persist:false});if(e.key?.startsWith('dsh:ekko-')){preferenceRevision++;refresh();}};
 const onPreferences=()=>{preferenceRevision++;refresh();};window.addEventListener('storage',onStorage);window.addEventListener('dsh:ekko-skin-preferences',onPreferences);
 void load();
 const catalogTimer=setInterval(()=>void load(),15000);const reloadCatalog=()=>void load();window.addEventListener('focus',reloadCatalog);
 ctx.effect(()=>async()=>{alive=false;clearInterval(catalogTimer);window.removeEventListener('focus',reloadCatalog);section?.();locale.disconnect();appearance.disconnect();window.removeEventListener('storage',onStorage);window.removeEventListener('dsh:ekko-skin-preferences',onPreferences);unsubscribe();navigation.dispose();await controller.dispose();style.remove();listeners.clear();imageCache.clear();},'ekko-skins: controller, section and presentation cleanup');
}
