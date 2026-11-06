import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {acquireShared} from '../src/shared-lease.mjs';
const runtime=process.env.DSH_MODULES;
test('two independently bundled themes share one root owner; removing the first keeps the second working',{skip:!runtime},async()=>{
 const {Context}=await import(pathToFileURL(runtime+'/cordis/lib/index.js'));
 const copy=(await import('../src/shared-lease.mjs?second-bundle')).acquireShared;
 const ctx=new Context();let starts=0,stops=0;
 const shared={name:'shared-test',apply(c){starts++;c.effect(()=>()=>{stops++;});}};
 const a=ctx.plugin({name:'theme-a',apply(c){acquireShared(c,'test',shared);}}),b=ctx.plugin({name:'theme-b',apply(c){copy(c,'test',shared);}});
 await Promise.all([a.await(),b.await()]);assert.equal(starts,1);await a.dispose();assert.equal(stops,0);await b.dispose();assert.equal(stops,1);
 await ctx.fiber.dispose();
});
