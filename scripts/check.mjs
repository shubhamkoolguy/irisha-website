import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const outputDir=process.env.BUILD_DIR||'dist';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const html=await readFile(`${outputDir}/index.html`,'utf8');
const parseData=html.match(/<script type="application\/json" id="site-data">([\s\S]*?)<\/script>/);
assert(parseData,'Serialized site content is missing.');
const data=JSON.parse(parseData[1]);
assert(!('whatsapp' in data.settings) && !('phone_display' in data.settings),'Contact data leaked into public JSON');
assert(html.includes('href="tel:+919966320256"'),'Public telephone link missing');
assert(html.includes('href="mailto:concierge@irisha.co.in"'),'Public email link missing');
assert(!html.includes('CONTACT_WHATSAPP'),'WhatsApp secret leaked into page source');
for(const collection of ['packages','fleet','holidays']){
 const records=await Promise.all((await readdir('content/'+collection)).filter(f=>f.endsWith('.json')).map(f=>json('content/'+collection+'/'+f)));
 const active=records.filter(x=>x.active);
 assert(active.length,`At least one ${collection} item must be active.`);
 assert(active.filter(x=>x.featured).length<=1,`Only one ${collection} item should be featured.`);
 const ids=new Set();
 for(const record of records){
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug),'Invalid slug: '+record.slug);
  assert(!ids.has(record.slug),'Duplicate slug: '+record.slug);ids.add(record.slug);
  assert(Number.isFinite(record.starting_price)&&record.starting_price>=0,'Prices must be nonnegative numbers.');
  if(record.image)await access(path.join(record.image.replace(/^\//,'')));
  assert(record.title && record.description,'Content records need a title and description.');
   if(collection==='holidays'){
    assert(['couple','family'].includes(record.audience),'Holiday audience must be couple or family: '+record.slug);
    assert(typeof record.country==='string' && record.country.trim(),'Holiday needs a country: '+record.slug);
   }
 }
}
for(const name of await readdir('content/offers')){
 if(!name.endsWith('.json'))continue;
 const offer=await json('content/offers/'+name);
 for(const prop of ['starts_at','ends_at'])if(offer[prop])assert(!Number.isNaN(Date.parse(offer[prop])),`Invalid offer ${prop}`);
 if(offer.starts_at&&offer.ends_at)assert(Date.parse(offer.starts_at)<Date.parse(offer.ends_at),'Offer must end after it starts.');
  assert(/^(#[a-zA-Z][\w-]*|\/(?!\/).+|https:\/\/.+)$/.test(offer.href),'Unsafe banner destination.');
}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,'Duplicate HTML IDs');
for(const [,target] of html.matchAll(/href="#([^"]+)"/g))assert(ids.includes(target),'Missing anchor: '+target);
  for(const [,target] of html.matchAll(/(?:src|href)="(\/[^"?#]+)"/g)){const targetPath=path.join(outputDir,target.slice(1));try{await access(targetPath);}catch{await access(`${targetPath}/index.html`);}}
  assert.equal((html.match(/<h1\b/g)||[]).length,1,'Homepage needs one h1.');
  for(const id of ['sacred-circuits','elite-fleet','holidays','contact','detail-dialog','inquiry-dialog'])assert(ids.includes(id));
  const serviceSlugs=new Set();
  for(const service of data.services){
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(service.slug),'Invalid service slug: '+service.slug);
    assert(!serviceSlugs.has(service.slug),'Duplicate service slug: '+service.slug);
    serviceSlugs.add(service.slug);
    const page=`${outputDir}/services/${service.slug}/index.html`;
    await access(page);
    const pageHtml=await readFile(page,'utf8');
    assert(pageHtml.includes(`<h1 id="hero-title">${service.title.replace(/&/g,'&amp;')}</h1>`),'Service page missing title: '+service.slug);
    assert.equal((pageHtml.match(/<h1\b/g)||[]).length,1,'Service page needs one h1: '+service.slug);
    if(service.slug!=='holidays-tours')assert(html.includes(`/services/${service.slug}/`),'Homepage must link to '+service.slug);
  }
  const holidaySlugs=new Set();
  for(const holiday of data.holidays||[]){
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(holiday.slug),'Invalid holiday slug: '+holiday.slug);
    assert(!holidaySlugs.has(holiday.slug),'Duplicate holiday slug: '+holiday.slug);
    holidaySlugs.add(holiday.slug);
    const page=`${outputDir}/holidays/${holiday.slug}/index.html`;
    await access(page);
    const pageHtml=await readFile(page,'utf8');
    assert(pageHtml.includes(`<h1 id="hero-title">${holiday.title.replace(/&/g,'&amp;')}</h1>`),'Holiday page missing title: '+holiday.slug);
    assert.equal((pageHtml.match(/<h1\b/g)||[]).length,1,'Holiday page needs one h1: '+holiday.slug);
  }
  const holidaysPage=await readFile(`${outputDir}/services/holidays-tours/index.html`,'utf8');
  assert(!holidaysPage.includes('href="/holidays/'),'Noindex holidays must not be linked from the indexable holiday service page.');
  assert(!html.includes('/services/holidays-tours/'),'Homepage must not promote non-indexable international holidays.');
  const sitemap=await readFile(`${outputDir}/sitemap.xml`,'utf8');
for(const [collection,pagePath,canonical] of [
    ['packages','sacred-circuits/sacred-triangle','https://irisha.co.in/sacred-circuits/sacred-triangle/'],
    ['packages','sacred-circuits/bihar-buddhist-pind-daan-circuit','https://irisha.co.in/sacred-circuits/bihar-buddhist-pind-daan-circuit/'],
    ['fleet','elite-fleet/force-urbania-hire-varanasi','https://irisha.co.in/elite-fleet/force-urbania-hire-varanasi/'],
    ['fleet','elite-fleet/innova-hycross-crysta-rental-varanasi','https://irisha.co.in/elite-fleet/innova-hycross-crysta-rental-varanasi/']
  ]){
    const page=`${outputDir}/${pagePath}/index.html`;
    await access(page);
    const pageHtml=await readFile(page,'utf8');
    assert.equal((pageHtml.match(/<h1\b/g)||[]).length,1,`${collection} page needs one h1`);
    assert(pageHtml.includes(`<link rel="canonical" href="${canonical}">`),`${collection} canonical missing`);
    assert(sitemap.includes(canonical),`${collection} URL missing from sitemap`);
    assert(pageHtml.includes('canonical'),`${collection} canonical metadata missing`);
  }
  for(const category of ['sacred-circuits','elite-fleet']){const page=`${outputDir}/${category}/index.html`;await access(page);assert((await readFile(page,'utf8')).includes('<h1 id="hero-title">'),`${category} index missing H1`);assert(sitemap.includes(`https://irisha.co.in/${category}/`),`${category} index absent from sitemap`);}
  const sacredPage=await readFile(`${outputDir}/sacred-circuits/sacred-triangle/index.html`,'utf8');
  for(const phrase of ['₹11,999','two guests sharing','3-star stay with breakfast','Taxes are extra','Flights are not included','Groups of 9 or more','temple rules'])assert(sacredPage.includes(phrase),`Sacred Triangle page missing approved disclosure: ${phrase}`);
  const sacredVisible=sacredPage.split('<script')[0];
  assert(!sacredVisible.includes('guarantee')&&!sacredVisible.includes('VIP Darshan passes'),'Sacred Triangle page contains an unsupported darshan guarantee.');
  const urbaniaPage=await readFile(`${outputDir}/elite-fleet/force-urbania-hire-varanasi/index.html`,'utf8');
  for(const phrase of ['16-Seater','₹35/km','₹2,999','within 300 km','taxes extra','Tolls, border tax, parking'])assert(urbaniaPage.includes(phrase),`Urbania page missing approved disclosure: ${phrase}`);
  assert(urbaniaPage.includes('urbania-feature-copy'),'Urbania feature copy panel is missing');
  assert(!html.includes('maps.app.goo.gl')&&!html.includes('g.page/r/'),'Homepage contains a Google review URL');
assert(html.includes('Khushi Mishra')&&html.includes('Ramanathan Karunanithi'),'Review names missing from homepage');
assert(html.includes('Read Google reviews')&&html.includes('share.google/J1Rixybpe20k2upx4'),'Google review source link missing');
for(const [route,phrase] of [['sacred-circuits/bihar-buddhist-pind-daan-circuit','Nalanda'],['sacred-circuits/varanasi-pilgrimage-concierge','Kashi Vishwanath'],['elite-fleet/innova-hycross-crysta-rental-varanasi','Innova Hycross']]){
  const page=await readFile(`${outputDir}/${route}/index.html`,'utf8');
  assert.equal((page.match(/<h1\b/g)||[]).length,1,`${route} needs one H1`);
  assert(page.includes(phrase),`${route} missing core copy`);
  assert(sitemap.includes(`https://irisha.co.in/${route}/`),`${route} missing from sitemap`);
}
for(const holiday of data.holidays||[]){
  const holidayPage=await readFile(`${outputDir}/holidays/${holiday.slug}/index.html`,'utf8');
  assert(holidayPage.includes('<meta name="robots" content="noindex,follow">'),`Holiday page must stay noindex pending editorial review: ${holiday.slug}`);
  assert(!sitemap.includes(`/holidays/${holiday.slug}/`),`Noindex holiday must not appear in sitemap: ${holiday.slug}`);
}
for(const generated of [html,...await Promise.all([`${outputDir}/sacred-circuits/index.html`,`${outputDir}/elite-fleet/index.html`].map(p=>readFile(p,'utf8')))])assert(!generated.includes('irisha-website.pages.dev'),'Private Pages preview host leaked into public output.');
const appSource=await readFile('public/app.js','utf8');
assert(appSource.includes('Darshan coordination is subject to temple rules'),'Booking policy must state darshan availability');
assert(appSource.includes('Google Tag Manager and Google Ads tags are present'),'Privacy copy must disclose installed tags');
assert(html.includes('name="phone" type="tel"')&&appSource.includes('Mobile / WhatsApp:'),'Inquiry flow must request phone and include it in prepared message');
assert.deepEqual(data.holidays,[],'Noindex international holidays should not be serialized into shared homepage content.');
assert(!html.includes('REPLACE_WITH'),'Public homepage contains setup placeholders.');
const cmsConfig=await readFile('admin/config.yml','utf8');
assert.equal(cmsConfig,await readFile(`${outputDir}/admin/config.yml`,'utf8'),'CMS output is stale.');
const cmsLines=cmsConfig.split('\n');
for(let i=0;i<cmsLines.length;i++){
  if(/widget:\s*select\s*$/.test(cmsLines[i]) && /^\s+options:/.test(cmsLines[i+1]||'')){
    assert.equal(cmsLines[i+1].match(/^(\s*)/)[0].length,cmsLines[i].match(/^(\s*)/)[0].length,'CMS YAML: options must align with widget: select (line '+(i+2)+').');
  }
}
for(const file of ['public/app.js','public/theme.js','admin/admin.js','scripts/build.mjs','server/oauth.mjs','functions/api/auth.js','functions/api/callback.js','server/contact-worker.mjs','scripts/build-worker.mjs','functions/api/contact.js','functions/api/captcha-config.js'])execFileSync(process.execPath,['--check',file]);
execFileSync(process.execPath,['scripts/check-theme.cjs'],{stdio:'inherit'});
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
