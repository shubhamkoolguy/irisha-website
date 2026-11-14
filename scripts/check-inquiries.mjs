import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import worker,{submitInquiry,validateInquiry} from '../server/contact-worker.mjs';
import {onRequest} from '../functions/api/inquiries.js';
const origin='https://irisha.example';
const body={submission_key:'12345678-1234-4234-8234-123456789abc',name:'Visitor',phone:'+91 99663 20256',service_id:'sacred-triangle',travel_date:'2026-12-10',travelers:2,pickup:'Airport',notes:'Trip',attribution:{utm_source:'search',landing_page_url:origin+'/'},company_website:''};
const env={WEBSITE_INQUIRY_SECRET:'test-only-crm-secret',INQUIRY_RATE_LIMITER:{limit:async({key})=>{assert.equal(key,'192.0.2.1');return {success:true};}}};
const make=(data=body,headers={})=>new Request(origin+'/api/inquiries',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...headers},body:typeof data==='string'?data:JSON.stringify(data)});
assert.equal((await submitInquiry(make(),{})).status,503);
for(const secret of [undefined,'',' ',123,'bad\nsecret'])assert.equal((await submitInquiry(make(),{...env,WEBSITE_INQUIRY_SECRET:secret})).status,503);
for(const endpoint of ['invalid','http://crm.example/inquiries','https://user:pass@crm.example/inquiries'])assert.equal((await submitInquiry(make(),{...env,CRM_INQUIRY_URL:endpoint})).status,503);
assert.equal((await submitInquiry(make(body,{'CF-Connecting-IP':''}),env)).status,503);
assert.equal((await submitInquiry(new Request(origin+'/api/inquiries'),env)).status,405);
assert.equal((await submitInquiry(make(body,{Origin:'https://evil.example'}),env)).status,403);
assert.equal((await submitInquiry(make(body,{'Sec-Fetch-Site':'cross-site'}),env)).status,403);
assert.equal((await submitInquiry(make(body,{'Content-Type':'text/plain'}),env)).status,415);
assert.equal((await submitInquiry(make(),{...env,INQUIRY_RATE_LIMITER:null})).status,503);
const edgeEnv={...env,INQUIRY_RATE_LIMITER:undefined,INQUIRY_EDGE_RATE_LIMITED:'true'};
for(const flag of [undefined,false,true,'false','TRUE',' true','1'])assert.equal((await submitInquiry(make(),{...edgeEnv,INQUIRY_EDGE_RATE_LIMITED:flag})).status,503);
assert.equal((await submitInquiry(make(),{...edgeEnv,INQUIRY_RATE_LIMITER:{}})).status,503);
assert.equal((await submitInquiry(make(),{...edgeEnv,INQUIRY_RATE_LIMITER:{limit:async()=>{throw Error();}}})).status,503);
assert.equal((await submitInquiry(make(),{...edgeEnv,INQUIRY_RATE_LIMITER:{limit:async()=>({success:false})}})).status,429);
assert.equal((await submitInquiry(make(),{...env,INQUIRY_RATE_LIMITER:{limit:async()=>{throw Error();}}})).status,503);
assert.equal((await submitInquiry(make(),{...env,INQUIRY_RATE_LIMITER:{limit:async()=>({success:false})}})).status,429);
assert.equal((await submitInquiry(make(' '.repeat(16385)),env)).status,413);
const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(9000));controller.enqueue(new Uint8Array(9000));controller.close();}});
assert.equal((await submitInquiry(new Request(origin+'/api/inquiries',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:stream,duplex:'half'}),env)).status,413);
for(const change of [{travelers:'2'},{travelers:0},{travelers:101},{travel_date:'2026-02-30'},{submission_key:'bad'},{service_id:'Bad service'},{phone:'abc'},{company_website:'spam'},{attribution:{consent:'yes'}},{attribution:{landing_page_url:origin+'/?name=PII'}},{extra:true},{token:''}])assert.throws(()=>validateInquiry({...body,...change}));
assert.equal(validateInquiry({...body,travel_date:null,travelers:null}).travelers,null);
const previous=globalThis.fetch;
let crmStatus=201, sent=[];
try{
  globalThis.fetch=async(url,init)=>{
    assert.equal(url,'https://wanderdesk-crm.pages.dev/api/integrations/website/inquiries');
    assert.equal(init.headers.Authorization,'Bearer '+env.WEBSITE_INQUIRY_SECRET);
    assert.equal(init.redirect,'error');
    const payload=JSON.parse(init.body);assert.deepEqual(Object.keys(payload),['submission_key','name','phone','service_id','travel_date','travelers','pickup','notes','attribution']);sent.push(payload);
    return Response.json({inquiry_reference:body.submission_key,status:'received',secret:'must-not-leak'}, {status:crmStatus});
  };
  let response=await onRequest({request:make(),env});assert.equal(response.status,201);
  assert.deepEqual(await response.json(),{inquiry_reference:body.submission_key,status:'received'});
  assert.match(response.headers.get('Cache-Control'),/no-store/);
  assert.equal((await onRequest({request:make(),env:edgeEnv})).status,201);
  assert.equal((await worker.fetch(make(),edgeEnv)).status,201);
  crmStatus=200;assert.equal((await worker.fetch(make(),env)).status,200);assert.deepEqual(sent[0],sent[1]);
  crmStatus=409;assert.equal((await submitInquiry(make(),env)).status,409);
  crmStatus=502;assert.equal((await submitInquiry(make(),env)).status,502);
  for(const reference of ['-'.repeat(36),null,123]){
    globalThis.fetch=async()=>Response.json({status:'received',inquiry_reference:reference});
    assert.equal((await submitInquiry(make(),env)).status,502);
  }
  globalThis.fetch=async()=>{throw new DOMException('Timeout','TimeoutError');};
  response=await submitInquiry(make(),env);assert.equal(response.status,502);assert.equal((await response.json()).error,'Could not confirm receipt. Please retry.');
}finally{globalThis.fetch=previous;}
for(const file of ['dist/app.js','dist/index.html','dist/server/index.js']){
  const source=await readFile(file,'utf8');assert(!source.includes(env.WEBSITE_INQUIRY_SECRET));
}
const app=await readFile('public/app.js','utf8');
assert(!app.includes('send_to'));assert(!app.includes('localStorage'));assert(app.includes("event:'inquiry_received'"));
assert(!/grecaptcha|captcha-config|verification-cancel|inquiry-verification/.test(app));
assert(!/inquiry-verification|captcha-widget|verification-cancel/.test(await readFile('dist/index.html','utf8')));
// Execute the actual inquiry flow with browser boundaries mocked, not live CRM requests.
function browserFlow(fetcher, navigationFails=false, {url=origin+'/',storage=new Map(),now=Date.now(),denied=false}={}){
  const nodes=new Map(), handlers={}, navigations=[],events=[],requests=[];
  const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,textContent:'',dataset:{},value:'',addEventListener(){},close(){this.open=false;},showModal(){this.open=true;},querySelector(){return node('close');},querySelectorAll(){return [];},setAttribute(){},getAttribute(){},focus(){}});return nodes.get(id);};
  const values={name:'Guest & family',phone:'+91 99663 20256',interest:'sacred-triangle',date:'10/12/2026',guests:'2',pickup:'Airport & hotel',notes:'Line one\nLine two + 50%?',company_website:''};
  const form=node('inquiry-form');
  const interest=node('interest');interest.options=[{value:'sacred-triangle',textContent:'The Sacred Triangle'},{value:'urbania',textContent:'Force Urbania'}];interest.selectedOptions=[{textContent:'Sacred & Private'}];
  form.elements={company_website:{value:''},interest,pickup:node('pickup')};
  form.reportValidity=()=>true;form.addEventListener=(type,fn)=>{handlers[type]=fn;};
  const window={dataLayer:events,gtag:()=>assert.fail('Duplicate gtag event'),matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},sessionStorage:{getItem:key=>{if(denied)throw Error('Denied');return storage.get(key)??null;},setItem:(key,value)=>{if(denied)throw Error('Denied');storage.set(key,value);},removeItem:key=>{if(denied)throw Error('Denied');storage.delete(key);}}};
  node('site-data').textContent=JSON.stringify({fleet:[],packages:[],holidays:[],offers:[]});
  const clicks=[];
  const document={getElementById:id=>id==='hero-image'?null:node(id),querySelector:()=>node('menu'),querySelectorAll:()=>[],addEventListener:(type,fn)=>{if(type==='click')clicks.push(fn);},body:{classList:{add(){},remove(){}}}};
  class Clock extends Date {static now(){return now;}}
  const page=new URL(url);
  const context={document,Date:Clock,setInterval(){},location:{search:page.search,origin:page.origin,pathname:page.pathname,assign:url=>{if(navigationFails)throw Error('Navigation blocked');navigations.push(url);}},window,URL,URLSearchParams,crypto,AbortSignal,FormData:class{get(key){return values[key];}},fetch:async(...args)=>{requests.push(args);return fetcher(...args);}};
  runInNewContext(app,context);
  return {nodes,values,handlers,navigations,events,requests,storage,click:(dataset)=>{const button={dataset,hasAttribute:key=>Object.hasOwn(dataset,key.replace('data-','')),closest:selector=>selector==='dialog'?null:selector.includes('data-inquire')?button:null};clicks.forEach(fn=>fn({target:button}));},submit:()=>handlers.submit({preventDefault(){}})};
}
const message=flow=>new URL(flow.nodes.get('inquiry-whatsapp').href).searchParams.get('text');
const fullDetails=flow=>{
  for(const value of ['Guest & family','+91 99663 20256','Sacred & Private','Travelers: 2','10/12/2026','Airport & hotel','Line one\nLine two + 50%?'])assert(message(flow).includes(value),value);
};
const successFlow=browserFlow(async()=>Response.json({status:'received',inquiry_reference:body.submission_key},{status:201}));
await successFlow.submit();fullDetails(successFlow);
assert(message(successFlow).includes('Inquiry reference: '+body.submission_key));
assert.equal(successFlow.navigations[0],successFlow.nodes.get('inquiry-whatsapp').href);
assert.equal(successFlow.nodes.get('inquiry-whatsapp').hidden,false);
await successFlow.submit();
successFlow.handlers.input();await successFlow.submit();
assert.equal(successFlow.requests.length,1);assert.equal(successFlow.events.length,1);
assert.deepEqual(JSON.parse(JSON.stringify(successFlow.events[0])),{event:'inquiry_received',inquiry_reference:body.submission_key,service_id:'sacred-triangle',transaction_id:body.submission_key});
successFlow.values.notes='Edited';successFlow.handlers.input();await successFlow.submit();
assert.notEqual(JSON.parse(successFlow.requests[0][1].body).submission_key,JSON.parse(successFlow.requests[1][1].body).submission_key);
for(const failure of [()=>Response.json({error:'Save failed'},{status:502}),()=>Response.json({error:'Saving unavailable'},{status:503}),()=>Response.json({error:'Rate limited'},{status:429}),()=>Response.json({error:'Conflict'},{status:409}),()=>{throw new DOMException('Timeout','TimeoutError');},()=>{throw new TypeError('Network failure');},()=>new Response('Not JSON',{status:502}),()=>Response.json({status:'received',inquiry_reference:'invalid'})]){
  let attempt=0;
  const flow=browserFlow(async()=>++attempt===1?failure():Response.json({status:'received',inquiry_reference:body.submission_key},{status:200}));
  await flow.submit();fullDetails(flow);
  assert(!message(flow).includes('reference'));assert.equal(flow.navigations[0],flow.nodes.get('inquiry-whatsapp').href);assert.equal(flow.events.length,0);
  assert.match(flow.nodes.get('inquiry-status').textContent,/receipt is unconfirmed/);
  assert.match(flow.nodes.get('inquiry-whatsapp').textContent,/directly/);
  await flow.submit();
  assert.equal(JSON.parse(flow.requests[0][1].body).submission_key,JSON.parse(flow.requests[1][1].body).submission_key);
  assert(!Object.hasOwn(JSON.parse(flow.requests[0][1].body),'token'));
  assert.equal(flow.events.length,1);
}
const unavailable=browserFlow(async()=>Response.json({configured:false},{status:503}));
await unavailable.submit();fullDetails(unavailable);assert.equal(unavailable.navigations.length,1);assert.equal(unavailable.requests.length,1);assert(!message(unavailable).includes('reference'));
const blocked=browserFlow(async()=>Response.json({status:'received',inquiry_reference:body.submission_key}),true);
for(const key of ['date','guests','pickup','notes'])blocked.values[key]='';
await blocked.submit();
assert.match(blocked.nodes.get('inquiry-status').textContent,/Inquiry received.*Click Continue/);
assert.equal(blocked.nodes.get('inquiry-whatsapp').hidden,false);
assert.match(message(blocked),/Travelers: Not decided yet\nTravel date: Not decided yet\nPickup: Not specified\nNotes: None/);
await blocked.submit();assert.equal(blocked.events.length,1);
const blockedFailure=browserFlow(async()=>Response.json({error:'Unavailable'},{status:503}),true);
await blockedFailure.submit();fullDetails(blockedFailure);assert.match(blockedFailure.nodes.get('inquiry-status').textContent,/receipt is unconfirmed/);assert.equal(blockedFailure.nodes.get('inquiry-whatsapp').hidden,false);assert.equal(blockedFailure.events.length,0);
let finish;
const busy=browserFlow(()=>new Promise(resolve=>{finish=resolve;}));
const submitting=busy.submit();await busy.submit();assert.equal(busy.requests.length,1);finish(Response.json({status:'received',inquiry_reference:body.submission_key}));await submitting;
console.log('PASS: full encoded WhatsApp details, automatic success/error/config fallback, manual backup, retry keys and duplicate-save/event guards.');
const receipt=async()=>Response.json({status:'received',inquiry_reference:body.submission_key});
const campaignStorage=new Map(), clock=Date.now();
const landing=browserFlow(receipt,false,{storage:campaignStorage,now:clock,url:origin+'/?gclid=Click_123&gbraid=Braid-1&wbraid=Braid_2&utm_source=google#private'});
await landing.submit();
const carried=browserFlow(receipt,false,{storage:campaignStorage,now:clock+1000,url:origin+'/elite-fleet/force-urbania/?unrelated=secret#private'});
await carried.submit();
const attribution=flow=>JSON.parse(flow.requests[0][1].body).attribution;
assert.deepEqual(attribution(carried),attribution(landing));
assert.equal(attribution(carried).landing_page_url,origin+'/');
assert(!campaignStorage.get('irisha.campaign').includes('Guest'));
const fresh=browserFlow(receipt,false,{storage:campaignStorage,now:clock+2000,url:origin+'/new/?utm_campaign=new'});
await fresh.submit();assert.deepEqual(attribution(fresh),{utm_campaign:'new',landing_page_url:origin+'/new/'});
for(const options of [{storage:campaignStorage,now:clock+2000+30*60*1000},{storage:new Map([['irisha.campaign','{broken']])},{storage:new Map([['irisha.campaign',JSON.stringify({capturedAt:clock,attribution:{gclid:'bad!',name:'PII',landing_page_url:origin+'/?secret=1'}})]])},{denied:true}]){
  const flow=browserFlow(receipt,false,{url:origin+'/clean/',...options});await flow.submit();assert.deepEqual(attribution(flow),{landing_page_url:origin+'/clean/'});
}
const deniedFresh=browserFlow(receipt,false,{denied:true,url:origin+'/?gbraid=Valid_1&wbraid=bad!&gclid=bad%0A&utm_source=%20'});
await deniedFresh.submit();assert.deepEqual(attribution(deniedFresh),{gbraid:'Valid_1',landing_page_url:origin+'/'});
assert.equal(validateInquiry({...body,attribution:attribution(landing)}).attribution.gbraid,'Braid-1');
for(const key of ['gclid','gbraid','wbraid'])for(const value of ['bad!','bad\n',' ',123])assert.throws(()=>validateInquiry({...body,attribution:{[key]:value}}));
for(const reference of ['-'.repeat(36),'123456781234-4234-8234-123456789ab-c',null]){
  const flow=browserFlow(async()=>Response.json({status:'received',inquiry_reference:reference}));await flow.submit();assert.equal(flow.events.length,0);assert(!message(flow).includes('Inquiry reference'));
}
const defaults=browserFlow(receipt,false,{url:origin+'/elite-fleet/force-urbania-hire-lucknow/'});
defaults.click({inquire:'The Sacred Triangle',pickup:'Lucknow'});
assert.equal(defaults.nodes.get('interest').value,'sacred-triangle');assert.equal(defaults.nodes.get('pickup').value,'Lucknow');
defaults.click({inquire:'unknown',pickup:'Varanasi'});
assert.equal(defaults.nodes.get('interest').value,'urbania');assert.equal(defaults.nodes.get('pickup').value,'Varanasi');
defaults.nodes.get('pickup').value='My hotel';defaults.click({inquire:'urbania',pickup:'Lucknow'});assert.equal(defaults.nodes.get('pickup').value,'My hotel');
defaults.nodes.get('pickup').value='';defaults.click({inquire:'urbania',pickup:'Lucknow'});assert.equal(defaults.nodes.get('pickup').value,'Lucknow');
defaults.nodes.get('pickup').value='';defaults.click({inquire:'unknown'});assert.equal(defaults.nodes.get('pickup').value,'Lucknow');
console.log('PASS: actual app execution, campaign navigation/replacement/expiry/validation/storage denial, exact receipt event and service/pickup defaults.');
console.log('PASS: CAPTCHA-free inquiry validation, origin, limiter fail-closed, body bounds, exact CRM payload, retries, errors, secret isolation and both routes.');
