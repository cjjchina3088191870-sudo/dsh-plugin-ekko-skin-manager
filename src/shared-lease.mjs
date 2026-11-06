/** Each installed theme leases one shared host/client plugin, scoped to the DSH root. */
export function acquireShared(ctx,key,plugin,config={}){
 const symbol=Symbol.for('dsh.ekko-skins.leases.'+key);
 const leases=globalThis[symbol]??=new WeakMap(),root=ctx.root;
 if(!root||typeof root.plugin!=='function')throw Error('DSH root context unavailable');
 let state=leases.get(root);
 if(!state){state={users:0,fiber:null};leases.set(root,state);try{state.fiber=root.plugin(plugin,config);}catch(error){leases.delete(root);throw error;}}
 state.users++;let released=false;
 ctx.effect(()=>()=>{if(released)return;released=true;if(--state.users===0){leases.delete(root);return state.fiber.dispose();}},'ekko-skins: shared '+key+' lease');
 return state.fiber;
}
