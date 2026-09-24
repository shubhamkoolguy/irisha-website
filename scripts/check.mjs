import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const html=await readFile('dist/index.html','utf8');
const parseData=html.match(/<script type="application\/json" id="site-data">([\s\S]*?)<\/script>/);
assert(parseData,'Serialized site content is missing.');
const data=JSON.parse(parseData[1]);
assert(!('whatsapp' in data.settings) && !('phone_display' in data.settings),'Contact data leaked into public JSON');
assert(!/href="(?:tel:|https:\/\/wa\.me\/)/.test(html),'Public contact bypass found');
assert(!/99663[\s+]*20256|919966320256/.test(html),'Contact number leaked into page source');
for(const collection of ['packages','fleet']){
 const records=await Promise.all((await readdir('content/'+collection)).filter(f=>f.endsWith('.json')).map(f=>json('content/'+collection+'/'+f)));
 const active=records.filter(x=>x.active);
 assert(active.length,`At least one ${collection} item must be active.`);
 assert(active.filter(x=>x.featured).length<=1,`Only one ${collection} item should be featured.`);
 const ids=new Set();
 for(const record of records){
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug),'Invalid slug: '+record.slug);
  assert(!ids.has(record.slug),'Duplicate slug: '+record.slug);ids.add(record.slug);
  assert(Number.isFinite(record.starting_price)&&record.starting_price>=0,'Prices must be nonnegative numbers.');
  if(record.image)await access(path.join('dist',record.image));
  assert(record.title && record.description,'Content records need a title and description.');
 }
}
for(const name of await readdir('content/offers')){
 if(!name.endsWith('.json'))continue;
 const offer=await json('content/offers/'+name);
 for(const prop of ['starts_at','ends_at'])if(offer[prop])assert(!Number.isNaN(Date.parse(offer[prop])),`Invalid offer ${prop}`);
 if(offer.starts_at&&offer.ends_at)assert(Date.parse(offer.starts_at)<Date.parse(offer.ends_at),'Offer must end after it starts.');
 assert(/^(#[a-zA-Z][\w-]*|https:\/\/.+)$/.test(offer.href),'Unsafe banner destination.');
}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,'Duplicate HTML IDs');
for(const [,target] of html.matchAll(/href="#([^"]+)"/g))assert(ids.includes(target),'Missing anchor: '+target);
for(const [,target] of html.matchAll(/(?:src|href)="(\/[^"?#]+)"/g))await access(path.join('dist',target));
assert.equal((html.match(/<h1\b/g)||[]).length,1,'Homepage needs one h1.');
for(const id of ['sacred-circuits','elite-fleet','holidays','contact','detail-dialog','inquiry-dialog'])assert(ids.includes(id));
assert(!html.includes('REPLACE_WITH'),'Public homepage contains setup placeholders.');
assert.equal(await readFile('admin/config.yml','utf8'),await readFile('dist/admin/config.yml','utf8'),'CMS output is stale.');
for(const file of ['dist/app.js','admin/admin.js','scripts/build.mjs','server/oauth.mjs','functions/api/auth.js','functions/api/callback.js','server/contact-worker.mjs','scripts/build-worker.mjs','functions/api/contact.js','functions/api/captcha-config.js'])execFileSync(process.execPath,['--check',file]);
// Critical OAuth boundaries: no real network or credentials are used here.
const {onRequestGet:authorize}=await import('../functions/api/auth.js');
const {onRequestGet:callback}=await import('../functions/api/callback.js');
const env={SITE_URL:'https://irisha.example',GITHUB_REPO:'example/irisha',GITHUB_CLIENT_ID:'test-client',GITHUB_CLIENT_SECRET:'test-secret'};
assert.equal((await authorize({request:new Request('https://irisha.example/api/auth'),env:{}})).status,503);
assert.equal((await authorize({request:new Request('https://other.example/api/auth'),env})).status,503);
assert.equal((await authorize({request:new Request('https://irisha.example/api/auth?site_id=other.example'),env})).status,403);
const authorized=await authorize({request:new Request('https://irisha.example/api/auth'),env});
assert.equal(authorized.status,302);
const redirect=new URL(authorized.headers.get('location'));
assert.equal(redirect.origin,'https://github.com');
assert.equal(redirect.searchParams.get('code_challenge_method'),'S256');
const state=redirect.searchParams.get('state');
const cookie=authorized.headers.get('set-cookie').split(';')[0];
assert(authorized.headers.get('set-cookie').includes('HttpOnly; Secure; SameSite=Lax'));
assert.equal((await callback({request:new Request('https://irisha.example/api/callback?code=code&state=wrong',{headers:{Cookie:cookie}}),env})).status,403);
const originalFetch=globalThis.fetch;
let canPush=false;
try {
 globalThis.fetch=async url=>String(url).includes('access_token')?Response.json({access_token:'test-ephemeral-token'}):String(url).endsWith('/user')?Response.json({id:1}):Response.json({permissions:{push:canPush}});
 const makeRequest=()=>new Request('https://irisha.example/api/callback?code=code&state='+state,{headers:{Cookie:cookie}});
 assert.equal((await callback({request:makeRequest(),env})).status,403);
 canPush=true;
 const response=await callback({request:makeRequest(),env});
 assert.equal(response.status,200);
 const body=await response.text();
 assert(body.includes('event.origin!==origin'),'Popup must check exact origin.');
 assert(body.includes('event.source!==window.opener'),'Popup must check opener.');
 assert(body.includes('authorization:github:success:'),'Missing Decap handshake.');
 assert(!body.includes('test-secret'),'OAuth secret leaked to callback.');
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert(response.headers.get('set-cookie').includes('Max-Age=0'));
} finally {globalThis.fetch=originalFetch;}
await import('./check-contact.mjs');
console.log('PASS: content, routes, local assets, pricing, offer dates, JavaScript syntax and OAuth security boundaries.');
console.log('CMS authentication awaits the business GitHub/Cloudflare connection.');
