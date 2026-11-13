const aborted=()=>Object.assign(new Error('Artwork loading cancelled'),{name:'AbortError'});
const retryUrl=(url,attempt)=>{
 if(!attempt)return url;
 const i=url.indexOf('#'),base=i<0?url:url.slice(0,i),fragment=i<0?'':url.slice(i);
 return base+(base.includes('?')?'&':'?')+'_ekko_retry='+Date.now()+'-'+attempt+fragment;
};

/** Bounded concurrency and per-request deadlines, rather than timing out
 * images while they are still queued in the browser's connection pool. */
export function createArtworkLoader({Image:ImageClass=globalThis.Image,fetch:fetchAsset,concurrency=4,timeout=20000,attempts=4,delays=[500,1500,3000],message=()=> 'Unable to load theme artwork'}={}){
 const loaded=new Set(),requests=new Set();let disposed=false;
 function check(signal){if(disposed||signal?.aborted)throw aborted();}
 function wait(ms,signal){return new Promise((resolve,reject)=>{
  const done=error=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);requests.delete(cancel);error?reject(error):resolve();};
  const cancel=()=>done(aborted()),timer=setTimeout(()=>done(),ms);
  requests.add(cancel);signal?.addEventListener('abort',cancel,{once:true});if(disposed||signal?.aborted)cancel();
 });}
 function once(url,signal,attempt){return new Promise((resolve,reject)=>{
  const image=new ImageClass(),network=new AbortController();let finished=false;
  const done=error=>{
   if(finished)return;finished=true;clearTimeout(timer);image.onload=image.onerror=null;
   signal?.removeEventListener('abort',cancel);requests.delete(cancel);
   if(error){network.abort();image.removeAttribute?.('src');reject(error);}else resolve();
  };
  const cancel=()=>done(aborted()),timer=setTimeout(()=>done(new Error('Artwork request timed out')),timeout);
  image.onload=()=>done();image.onerror=()=>done(new Error('Artwork request failed'));
  requests.add(cancel);signal?.addEventListener('abort',cancel,{once:true});
  if(disposed||signal?.aborted){cancel();return;}
  image.decoding='async';
  if(attempt&&fetchAsset){
   // Reload the canonical URL as well, so CSS and mounted <img> elements do not
   // reuse a negatively cached response after a successful preflight.
   fetchAsset(url,{cache:'reload',credentials:'same-origin',signal:network.signal}).then(async response=>{
    if(!response.ok)throw new Error('Artwork HTTP '+response.status);await response.arrayBuffer();
    if(!finished)image.src=url;
   }).catch(done);
  }else image.src=retryUrl(url,attempt);
 });}
 async function asset(url,signal){
  if(loaded.has(url))return;
  for(let attempt=0;attempt<attempts;attempt++){
   check(signal);if(attempt)await wait(delays[Math.min(attempt-1,delays.length-1)]||0,signal);
   try{await once(url,signal,attempt);check(signal);loaded.add(url);return;}
   catch(error){if(error.name==='AbortError')throw error;if(attempt===attempts-1)throw Object.assign(new Error(message()),{cause:error,asset:url});}
  }
 }
 return{
  async prepare(provider,{signal}={}){
   check(signal);
   const urls=[...new Set(Object.values(provider.assets))].filter(url=>typeof url==='string'&&!url.startsWith('data:')&&!loaded.has(url));
   // Stop the remaining workers on terminal failure as well as cancellation.
   const batch=new AbortController(),forward=()=>batch.abort();let cursor=0;
   signal?.addEventListener('abort',forward,{once:true});if(signal?.aborted)batch.abort();
   async function worker(){while(cursor<urls.length){check(batch.signal);await asset(urls[cursor++],batch.signal);}}
   try{await Promise.all(Array.from({length:Math.min(concurrency,urls.length)},()=>worker()));}
   catch(error){batch.abort();throw error;}
   finally{signal?.removeEventListener('abort',forward);}
  },
  dispose(){disposed=true;for(const cancel of [...requests])cancel();loaded.clear();}
 };
}
