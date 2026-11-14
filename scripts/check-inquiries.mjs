import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker,{submitInquiry,validateInquiry} from '../server/contact-worker.mjs';
import {onRequest} from '../functions/api/inquiries.js';
const origin='https://irisha.example';
const body={submission_key:'12345678-1234-4234-8234-123456789abc',name:'Visitor',phone:'+91 99663 20256',service_id:'sacred-triangle',travel_date:'2026-12-10',travelers:2,pickup:'Airport',notes:'Trip',attribution:{utm_source:'search',landing_page_url:origin+'/'},token:'token',company_website:''};
const env={WEBSITE_INQUIRY_SECRET:'test-only-crm-secret',RECAPTCHA_SITE_KEY:'key',RECAPTCHA_SECRET_KEY:'test-only-captcha-secret',RECAPTCHA_ALLOWED_HOSTNAMES:'irisha.example',CONTACT_WHATSAPP:'919966320256',INQUIRY_RATE_LIMITER:{limit:async({key})=>{assert.equal(key,'192.0.2.1');return {success:true};}}};
const make=(data=body,headers={})=>new Request(origin+'/api/inquiries',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...headers},body:typeof data==='string'?data:JSON.stringify(data)});
assert.equal((await submitInquiry(make(),{})).status,503);
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
let crmStatus=201, sent=[],captcha=true;
try{
  globalThis.fetch=async(url,init)=>{
    if(String(url).includes('google.com'))return Response.json({success:captcha,hostname:'irisha.example'});
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
  captcha=false;assert.equal((await submitInquiry(make(),env)).status,403);
  assert.equal((await submitInquiry(make(),edgeEnv)).status,403);
  assert.equal((await submitInquiry(make(),{...edgeEnv,RECAPTCHA_SECRET_KEY:''})).status,503);
  captcha=true;globalThis.fetch=async()=>{throw new DOMException('Timeout','TimeoutError');};
  response=await submitInquiry(make(),env);assert.equal(response.status,503);
  let calls=0;globalThis.fetch=async()=>{if(++calls===1)return Response.json({success:true,hostname:'irisha.example'});throw new DOMException('Timeout','TimeoutError');};
  response=await submitInquiry(make(),env);assert.equal(response.status,502);assert.equal((await response.json()).error,'Could not confirm receipt. Please retry.');
}finally{globalThis.fetch=previous;}
for(const file of ['dist/app.js','dist/index.html','dist/server/index.js']){
  const source=await readFile(file,'utf8');assert(!source.includes(env.WEBSITE_INQUIRY_SECRET));assert(!source.includes(env.RECAPTCHA_SECRET_KEY));
}
const app=await readFile('public/app.js','utf8');
assert(!app.includes("'event','conversion'"));assert(!app.includes('window.location.assign(url)'));assert(!app.includes('localStorage'));assert(app.includes("'event','inquiry_received'"));
console.log('PASS: inquiry validation, origin, limiter fail-closed, body bounds, CAPTCHA, exact CRM payload, retries, errors, secret isolation and both routes.');
