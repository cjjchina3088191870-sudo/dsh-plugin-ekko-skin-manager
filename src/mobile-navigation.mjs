/** Phone launchers delegate to the live native controls; the host keeps its drawer,
 * focus trap, permission checks, session actions and dismissal behavior. */
export function createMobileNavigation({layout,document:doc=document}){
 const view=doc.defaultView,body=doc.body;
 let current=null,nav,brand,actions,footer,frame,sidebar,center,raf=0,disposed=false;
 const marked=new Map(),buttons=new Map();
 const mark=(el,name,value='')=>{
  if(!el)return;
  if(!marked.has(el))marked.set(el,new Map());
  const attrs=marked.get(el);if(!attrs.has(name))attrs.set(name,el.getAttribute(name));
  if(el.getAttribute(name)!==value)el.setAttribute(name,value);
 };
 const restore=()=>{for(const[el,attrs]of marked)for(const[name,value]of attrs)value===null?el.removeAttribute(name):el.setAttribute(name,value);marked.clear();};
 const phone=()=>view.innerWidth<=700&&view.innerHeight>=view.innerWidth;
 const isOpen=()=>frame&&!frame.hasAttribute('data-sidebar-collapsed');
 const nativeButton=key=>{
  if(!sidebar)return null;
  if(key==='new')return sidebar.querySelector('button[class*="_newSession"]');
  if(key==='search')return sidebar.querySelector('button[class*="_searchButton"]');
  if(key==='account')return sidebar.querySelector('button[aria-label="账号菜单"],button[aria-label="Account menu"]');
  if(key.startsWith('panel:'))return [...sidebar.querySelectorAll('button[class*="_panelRow"]')].find(el=>el.getAttribute('aria-label')===key.slice(6));
  return null;
 };
 function activate(key){
  const target=nativeButton(key);if(!target||target.disabled)return;
  if(key==='search'||key==='account'||target.hasAttribute('aria-haspopup')){
   if(!isOpen())layout.toggleSidebar();
   view.requestAnimationFrame(()=>{if(!disposed)nativeButton(key)?.click();});
  }else target.click();
 }
 function makeButton(key,label){
  const button=doc.createElement('button');button.type='button';button.className='ekko-mobile-action';
  button.dataset.ekkoMobileAction=key;button.setAttribute('aria-label',label);button.title=label;
  button.addEventListener('click',()=>activate(key));buttons.set(key,button);return button;
 }
 function mount(){
  nav=doc.createElement('nav');nav.className='ekko-mobile-navigation';nav.setAttribute('aria-label','手机导航');
  nav.dataset.ekkoMobileNavigation='';
  brand=doc.createElement('button');brand.type='button';brand.className='ekko-mobile-brand';
  brand.dataset.sidebarOpener='';brand.setAttribute('aria-label','打开侧边栏');brand.title='打开侧边栏';
  brand.addEventListener('click',()=>layout.toggleSidebar());
  actions=doc.createElement('div');actions.className='ekko-mobile-actions';
  footer=doc.createElement('div');footer.className='ekko-mobile-footer';
  nav.append(brand,actions,footer);body.prepend(nav);
 }
 function paintButton(key,target,parent){
  if(!target)return;
  const label=target.getAttribute('aria-label')||target.textContent.trim();
  let button=buttons.get(key);if(!button){button=makeButton(key,label);parent.append(button);}
  button.setAttribute('aria-label',label);button.title=label;button.disabled=target.disabled;
  const selected=target.getAttribute('aria-current');if(selected)button.setAttribute('aria-current',selected);else button.removeAttribute('aria-current');
  const icon=target.querySelector('svg,img');
  const signature=icon?.outerHTML||'';
  if(button.dataset.iconSignature!==signature){button.replaceChildren(...(icon?[icon.cloneNode(true)]:[]));button.dataset.iconSignature=signature;}
 }
 function clear(){
  nav?.remove();nav=brand=actions=footer=undefined;buttons.clear();restore();frame=sidebar=center=undefined;
 }
 function sync(){
  if(disposed)return;
  if(!current||!phone()||!body.hasAttribute('data-dsh-ekko-'+current.skin)){if(nav||marked.size)clear();return;}
  const nextSidebar=doc.querySelector('[data-slot="sidebar"]'),nextFrame=nextSidebar?.closest('[class*="_frame"]');
  if(!nextSidebar||!nextFrame)return;
  if(frame&&frame!==nextFrame)clear();
  frame=nextFrame;sidebar=nextSidebar;center=frame.querySelector('[class*="_centerCol"]');
  if(!nav)mount();
  mark(body,'data-ekko-mobile-nav',current.mode==='rail'?'rail':'corner');
  mark(body,'data-ekko-mobile-drawer-open',String(isOpen()));
  mark(frame,'data-ekko-mobile-frame');mark(center,'data-ekko-mobile-center');
  mark(sidebar.closest('[class*="_sidebarCol"]'),'data-ekko-mobile-drawer');
  mark(sidebar,'id','ekko-mobile-native-sidebar');
  brand.setAttribute('aria-controls','ekko-mobile-native-sidebar');brand.setAttribute('aria-expanded',String(isOpen()));
  const lang=/^zh/i.test(doc.documentElement.lang||view.navigator.language),openLabel=lang?'打开侧边栏':'Open sidebar';
  nav.setAttribute('aria-label',lang?'手机导航':'Phone navigation');brand.setAttribute('aria-label',openLabel);brand.title=openLabel;
  if(brand.dataset.mark!==current.mark){const img=doc.createElement('img');img.src=current.mark;img.alt='';img.draggable=false;brand.replaceChildren(img);brand.dataset.mark=current.mark;}
  const wanted=new Set(['new','search','account']);
  paintButton('new',nativeButton('new'),actions);
  for(const target of sidebar.querySelectorAll('button[class*="_panelRow"]')){
   const label=target.getAttribute('aria-label');if(!label)continue;
   const key='panel:'+label;wanted.add(key);paintButton(key,target,actions);
  }
  paintButton('search',nativeButton('search'),actions);paintButton('account',nativeButton('account'),footer);
  for(const[key,button]of buttons)if(!wanted.has(key)||!nativeButton(key)){button.remove();buttons.delete(key);}
 }
 function schedule(){if(!raf&&!disposed)raf=view.requestAnimationFrame(()=>{raf=0;sync();});}
 const observer=new view.MutationObserver(records=>{
  if(records.some(record=>{
   const target=record.target.nodeType===1?record.target:record.target.parentElement;
   if(target?.closest('[data-ekko-mobile-navigation]'))return false;
   if(record.type==='attributes')return record.attributeName==='data-sidebar-collapsed'||target?.closest('[data-slot="sidebar"]')||target===doc.documentElement;
   return [...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1&&!node.hasAttribute?.('data-ekko-mobile-navigation'));
  }))schedule();
 });
 observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-sidebar-collapsed','aria-current','aria-label','disabled','lang']});
 const closeAfterSelection=event=>{
  if(!current||!phone()||!isOpen()||!sidebar?.contains(event.target))return;
  const target=event.target.closest?.('button,[role="button"],a'),row=event.target.closest?.('[data-row-key^="session:"]');
  if(event.target.closest?.('[aria-haspopup],[role="menu"],input,textarea'))return;
  if(row&&target&&target!==row)return;
  if(!row&&!event.target.closest?.('button[class*="_newSession"]'))return;
  view.requestAnimationFrame(()=>{if(!disposed&&isOpen())layout.toggleSidebar();});
 };
 doc.addEventListener('click',closeAfterSelection,true);view.addEventListener('resize',schedule);
 return {
  update(value){current=value;sync();},
  dispose(){disposed=true;observer.disconnect();doc.removeEventListener('click',closeAfterSelection,true);view.removeEventListener('resize',schedule);if(raf)view.cancelAnimationFrame(raf);clear();}
 };
}
