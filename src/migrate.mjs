import fs from'node:fs';import path from'node:path';import os from'node:os';import{pathToFileURL}from'node:url';import YAML from'yaml';
const KNOWN=new Set(['ui-skin-ekko-rose','ui-skin-ekko-miku','ui-skin-deep-whale-manager','ekko-skin-manager']);
export function migrate(home,profileName='web'){
 home=path.resolve(home);if(!/^[a-zA-Z0-9_-]+$/.test(profileName))throw Error('Invalid profile name');
 const profile=path.join(home,'profiles',profileName),files=[path.join(home,'cordis.patch.yml'),path.join(profile,'cordis.patch.yml')];
 if(!fs.existsSync(path.join(profile,'package.json')))throw Error('DSH profile is not installed');
 const profileMeta=JSON.parse(fs.readFileSync(path.join(profile,'package.json'),'utf8'));const hasLegacyManager=!!profileMeta.dependencies?.['@smalltailqwq/dsh-client-ui-skin-deep-whale-manager'];
 const docs=files.map(file=>({file,source:fs.existsSync(file)?fs.readFileSync(file,'utf8'):'[]\n'})).map(row=>({...row,doc:YAML.parseDocument(row.source)}));
 for(const row of docs)if(row.doc.errors.length||!YAML.isSeq(row.doc.contents))throw Error('Expected a valid patch sequence');
 let preferred='rose';
 for(const{doc}of docs){const active=doc.contents.items.filter(n=>YAML.isMap(n)&&['ui-skin-ekko-rose','ui-skin-ekko-miku'].includes(n.get('id'))&&n.get('disabled')===false);if(active.length===1)preferred=active[0].get('id').endsWith('miku')?'miku':'rose';const previous=doc.contents.items.find(n=>YAML.isMap(n)&&n.get('id')==='ekko-skin-manager');const selected=previous?.get('config')?.get('defaultSkin');if(['rose','miku','default'].includes(selected))preferred=selected;}
 for(const row of docs){const{doc}=row,unrelated=JSON.stringify(doc.toJSON().filter(n=>!KNOWN.has(n?.id)));
  const oldManager=doc.contents.items.find(n=>YAML.isMap(n)&&n.get('id')==='ui-skin-deep-whale-manager');if(hasLegacyManager){if(oldManager)oldManager.set('disabled',true);else doc.contents.add({id:'ui-skin-deep-whale-manager',disabled:true});}else doc.contents.items=doc.contents.items.filter(n=>!YAML.isMap(n)||n.get('id')!=='ui-skin-deep-whale-manager');
  for(const id of ['ui-skin-ekko-rose','ui-skin-ekko-miku']){const item=doc.contents.items.find(n=>YAML.isMap(n)&&n.get('id')===id);if(item)item.set('disabled',false);else doc.contents.add({id,disabled:false});}
  const manager=doc.contents.items.find(n=>YAML.isMap(n)&&n.get('id')==='ekko-skin-manager');if(manager){manager.set('disabled',false);manager.set('config',{defaultSkin:preferred});}else doc.contents.add({id:'ekko-skin-manager',disabled:false,config:{defaultSkin:preferred}});
  if(JSON.stringify(doc.toJSON().filter(n=>!KNOWN.has(n?.id)))!==unrelated)throw Error('Unrelated configuration would change');row.updated=doc.toString();
 }
 const backup=path.join(home,'ekko-skins-backups',Date.now()+'-'+Math.random().toString(16).slice(2,8));fs.mkdirSync(backup,{recursive:true,mode:0o700});
 for(let i=0;i<docs.length;i++)fs.writeFileSync(path.join(backup,(i?'profile':'root')+'-cordis.patch.yml'),docs[i].source,{mode:0o600,flag:'wx'});
 for(const row of docs)if((fs.existsSync(row.file)?fs.readFileSync(row.file,'utf8'):'[]\n')!==row.source)throw Error('Configuration changed during migration; retry');
 const written=[];
 try{for(const row of docs){const temp=row.file+'.ekko-manager.tmp';fs.writeFileSync(temp,row.updated,{mode:0o600});fs.renameSync(temp,row.file);written.push(row);}}catch(error){for(const row of written)fs.writeFileSync(row.file,row.source,{mode:0o600});throw error;}
 return{preferred,backup,unrelatedConfigurationPreserved:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{console.log(JSON.stringify(migrate(process.argv[2]||process.env.DSH_HOME||path.join(os.homedir(),'.dsh'),process.argv[3]||'web')));}catch(error){console.error(error.message);process.exitCode=1;}}
