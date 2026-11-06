import {apply as mountManager,inject} from './client.jsx';
import {acquireShared} from './shared-lease.mjs';
export {inject};
const manager={name:'ekko-skins-shared-client-v2',inject,apply:mountManager};
export function acquireClient(ctx){return acquireShared(ctx,'client-v2',manager);}
export function apply(ctx){acquireClient(ctx);}
