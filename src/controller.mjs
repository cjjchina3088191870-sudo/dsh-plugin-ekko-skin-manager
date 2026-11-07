export const SELECTION_KEY='dsh:ekko-skins:selection:v1';
export const SKIN_IDS=['default','rose','miku'];
export function readSelection(storage,fallback='rose'){
 try{const value=JSON.parse(storage.getItem(SELECTION_KEY));if(value?.version===1&&SKIN_IDS.includes(value.skin))return value.skin;}catch{}
 const old={};for(const id of ['rose','miku'])try{old[id]=JSON.parse(storage.getItem('dsh:ekko-'+id+':v1'))?.enabled;}catch{}
 if(old.rose===false&&old.miku===true)return 'miku';
 if(old.miku===false&&old.rose===true)return 'rose';
 if(old.rose===false&&old.miku===false)return 'default';
 return SKIN_IDS.includes(fallback)?fallback:'rose';
}

/** One serial owner of theme presentation lifetimes; host plugin enablement is not selection. */
export function createController({storage,mount,prepare=async()=>{},fallback='rose'}){
 const providers=new Map(),listeners=new Set();
 let wanted=readSelection(storage,fallback),persistWanted=true,runtime=null,epoch=0,closed=false,initialized=false,tail=Promise.resolve();
 let snapshot={selected:'default',desired:wanted,busy:false,error:null,available:[]};
 const publish=value=>{snapshot={...snapshot,...value,available:[...providers.keys()]};for(const fn of listeners)fn();};
 async function release(){const previous=runtime;runtime=null;if(previous)await previous.handle.dispose();}
 function reconcile(){
  if(closed)return Promise.resolve();
  const ticket=++epoch,target=wanted,persist=persistWanted;
  publish({desired:target,busy:true,error:null});
  tail=tail.catch(()=>{}).then(async()=>{
   if(closed||ticket!==epoch)return;
   const provider=providers.get(target);
   if(target!=='default'&&!provider){
    if(runtime&&providers.get(runtime.provider.id)!==runtime.provider){await release();publish({selected:'default'});}
    return; // A provider can arrive after the manager or during HMR.
   }
   if(runtime?.provider!==provider||target==='default'){
    if(provider)await prepare(provider);
    if(closed||ticket!==epoch)return;
    await release();
    if(closed||ticket!==epoch)return;
    if(provider){
     runtime={provider,handle:mount(provider)};
     try{await runtime.handle.ready();}catch(error){await release();throw error;}
     if(closed||ticket!==epoch){await release();return;}
    }
   }
   if(persist)try{storage.setItem(SELECTION_KEY,JSON.stringify({version:1,skin:target}));}catch{}
   publish({selected:target,busy:false,error:null});
  }).catch(error=>{if(!closed&&ticket===epoch)publish({selected:runtime?.provider.id||'default',busy:false,error:String(error?.message||error)});});
  return tail;
 }
 return{
  getSnapshot:()=>snapshot,
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  register(provider){
   if(!['rose','miku'].includes(provider.id)||typeof provider.plugin?.apply!=='function')throw new TypeError('Unknown Ekko skin provider');
   const existing=providers.get(provider.id);
   if(existing&&(existing.priority||0)>(provider.priority||0))return()=>{};
   providers.set(provider.id,provider);publish({});
   if(initialized&&provider.id===wanted)void reconcile();
   return()=>{if(providers.get(provider.id)!==provider)return;providers.delete(provider.id);publish({});if(provider.id===wanted||runtime?.provider===provider)void reconcile();};
  },
  choose(id,{persist=true}={}){if(!SKIN_IDS.includes(id))return Promise.reject(new TypeError('Unknown skin'));initialized=true;wanted=id;persistWanted=persist;return reconcile();},
  initialize(defaultSkin,installedIds){
   initialized=true;wanted=readSelection(storage,defaultSkin);
   // The catalog knows what is installed before client providers finish loading.
   // Preserve explicit native appearance, but do not wait for an absent skin.
   if(Array.isArray(installedIds)&&wanted!=='default'&&!installedIds.includes(wanted))wanted=defaultSkin==='default'?'default':(installedIds.includes(defaultSkin)?defaultSkin:(SKIN_IDS.find(id=>id!=='default'&&installedIds.includes(id))||'default'));
   persistWanted=true;return reconcile();
  },
  provider:id=>providers.get(id),
  settled:()=>tail,
  async dispose(){if(closed)return;closed=true;++epoch;await tail.catch(()=>{});await release();listeners.clear();providers.clear();}
 };
}
