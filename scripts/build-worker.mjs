import {readFile,writeFile,mkdir,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
process.chdir(new URL('../',import.meta.url).pathname);
const assets={};
async function collect(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  if(entry.name.startsWith('.') || entry.name.startsWith('_') || entry.name==='server')continue;
  const file=path.join(dir,entry.name);
  if(entry.isDirectory())await collect(file);
  else assets['/'+path.relative('dist',file)]=(await readFile(file)).toString('base64');
 }
}
await collect('dist');
const source=await readFile('server/contact-worker.mjs','utf8');
const marker='const EMBEDDED_ASSETS = null;';
if(!source.includes(marker))throw Error('Worker asset marker missing.');
await mkdir('dist/server',{recursive:true});
await writeFile('dist/server/index.js',source.replace(marker,'const EMBEDDED_ASSETS = '+JSON.stringify(assets)+';'));
await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
console.log('Built dependency-free contact-verification Worker with '+Object.keys(assets).length+' public assets.');
