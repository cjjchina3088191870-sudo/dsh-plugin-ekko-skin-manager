import {apply as mountHost} from './index.mjs';
import {acquireShared} from './shared-lease.mjs';
export {createHandler,PREFIX} from './index.mjs';
const host={name:'ekko-skins-shared-host-v2',apply:mountHost};
export function acquireHost(ctx,config={}){return acquireShared(ctx,'host-v2',host,config);}
export function apply(ctx,config={}){acquireHost(ctx,config);}
