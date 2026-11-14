import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import path from 'node:path';

const output=process.env.BUILD_DIR||'dist';
const cities=['Varanasi','Lucknow','Ayodhya','Chitrakoot','Gaya','Bodhgaya','Prayagraj'];
const read=route=>readFile(path.join(output,route,'index.html'),'utf8');
const decode=text=>text.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
for(const city of cities){
  const route=`elite-fleet/force-urbania-hire-${city.toLowerCase()}`;
  const html=await read(route);
  assert(html.includes(`<title>Force Urbania Hire in ${city} | Irisha Concierge</title>`));
  assert(html.includes(`<h1 id="hero-title">Force Urbania Hire in ${city}</h1>`));
  assert(html.includes(`rel="canonical" href="https://irisha.co.in/${route}/"`));
  assert(html.includes(`data-inquire="Force Urbania" data-pickup="${city}"`));
  assert(!html.includes('Sigra Varanasi'));
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  for(const node of schema['@graph'].filter(node=>node.areaServed)) assert.deepEqual(node.areaServed.map(area=>area.name),cities);
  const visible=[...html.matchAll(/<details class="faq-item"><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/g)].map(match=>[decode(match[1]),decode(match[2])]);
  const faq=schema['@graph'].find(node=>node['@type']==='FAQPage');
  assert.deepEqual(visible,faq.mainEntity.map(q=>[q.name,q.acceptedAnswer.text]));
  assert(html.includes('250 km/day'));
  assert(html.includes('positioning'));
  for(const other of cities) assert(html.includes(`/elite-fleet/force-urbania-hire-${other.toLowerCase()}/`));
  const options=[...html.matchAll(/<option value="([^"]+)">/g)].map(match=>match[1]);
  assert(!options.some(slug=>/couple|holiday|family-getaway|retreat|odyssey|safari/.test(slug)));
}
for(const route of ['sacred-circuits/varanasi-prayagraj-ayodhya-tour','sacred-circuits/nalanda-gaya-bodhgaya-tour','elite-fleet/innova-crysta-hycross-hire-varanasi']){
  const html=await read(route);
  assert(!html.includes('<a class="button" href="/#contact">'));
  assert(/<button[^>]+data-inquire=/.test(html));
}
const sitemap=await readFile(path.join(output,'sitemap.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>match[1]);
assert.equal(new Set(urls).size,urls.length);
for(const url of urls){
  const route=new URL(url).pathname;
  assert(!route.startsWith('/services/') && !route.startsWith('/holidays/'));
  await access(path.join(output,route,'index.html'));
}
for(const city of cities) assert(urls.includes(`https://irisha.co.in/elite-fleet/force-urbania-hire-${city.toLowerCase()}/`));
const llms=await readFile(path.join(output,'llms.txt'),'utf8');
assert(!llms.includes('/holidays/') && !llms.includes('/services/'));
for(const url of [...llms.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map(match=>match[1])) await access(path.join(output,new URL(url).pathname,'index.html'));
const home=await read('');
assert(home.includes('Travel planning &amp;<br><em>concierge services.</em>'));
console.log('Build SEO checks passed: seven cities, matching FAQ/schema, booking buttons, sitemap and llms links.');
