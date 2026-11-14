// Shared contact protection for Sites and Cloudflare Pages Functions.
// The deployment build embeds only PUBLIC files here. Runtime secrets never enter it.
const EMBEDDED_ASSETS = null;
const TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const TEST_SECRET_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';
const unavailable = 'Contact verification is temporarily unavailable. Please try again later.';
const noStore = {'Cache-Control':'no-store, private','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'};
const reply = (data, status = 200) => Response.json(data, {status, headers: noStore});
function config(env, request) {
  const url = new URL(request.url);
  const hosts = String(env.RECAPTCHA_ALLOWED_HOSTNAMES || '').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  const siteKey = String(env.RECAPTCHA_SITE_KEY || '').trim();
  const secret = String(env.RECAPTCHA_SECRET_KEY || '').trim();
  const number = String(env.CONTACT_WHATSAPP || '').trim();
  if(url.protocol !== 'https:' || !hosts.includes(url.hostname.toLowerCase()) || !siteKey || !secret || siteKey===TEST_SITE_KEY || secret===TEST_SECRET_KEY || !/^[1-9][0-9]{7,14}$/.test(number))return null;
  return {siteKey,secret,number,hosts,hostname:url.hostname.toLowerCase(),origin:url.origin};
}
export function getCaptchaConfig(request,env) {
  if(request.method !== 'GET')return reply({error:'Method not allowed.'},405);
  const settings = config(env,request);
  if(!settings)return reply({configured:false,error:unavailable},503);
  return reply({configured:true,siteKey:settings.siteKey});
}
async function readBody(request, max = 12288) {
  if(Number(request.headers.get('Content-Length') || 0)>max)throw Error('body-size');
  const reader=request.body?.getReader();
  if(!reader)throw Error('body');
  const chunks=[]; let size=0;
  try {
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error('body-size');}chunks.push(value);}
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const attributionFields = ['gclid','utm_source','utm_medium','utm_campaign','utm_term','utm_content','landing_page_url'];
export function validateInquiry(body) {
  const fields=['submission_key','name','phone','service_id','travel_date','travelers','pickup','notes','attribution','company_website'];
  if(!body || typeof body!=='object' || Array.isArray(body) || Object.keys(body).some(key=>!fields.includes(key)))throw Error('Invalid inquiry.');
  const text=(key,max,required=false)=>{
    const value=body[key];
    if(typeof value!=='string' || value.length>max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) || (required&&!value.trim()))throw Error('Invalid '+key+'.');
    return value.trim();
  };
  const submission_key=text('submission_key',36,true),name=text('name',200,true),phone=text('phone',40,true),service_id=text('service_id',100,true);
  if(!uuid.test(submission_key) || !/^\+?[0-9 ()-]+$/.test(phone) || !/^\d{6,15}$/.test(phone.replace(/\D/g,'')) || !/^[\w-]{1,100}$/.test(service_id))throw Error('Invalid inquiry.');
  const travel_date=body.travel_date;
  if(travel_date!==null && (typeof travel_date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(travel_date) || !Number.isFinite(Date.parse(travel_date)) || new Date(travel_date).toISOString().slice(0,10)!==travel_date))throw Error('Invalid travel date.');
  const travelers=body.travelers;
  if(travelers!==null && (!Number.isInteger(travelers)||travelers<1||travelers>100))throw Error('Invalid travelers.');
  if(!body.attribution || typeof body.attribution!=='object' || Array.isArray(body.attribution))throw Error('Invalid attribution.');
  const attribution={};
  for(const [key,value] of Object.entries(body.attribution)){
    if(!attributionFields.includes(key)||typeof value!=='string'||value.length>500||/[\u0000-\u001f]/.test(value))throw Error('Invalid attribution.');
    if(key==='landing_page_url'){
      const url=new URL(value);
      if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error('Invalid landing page.');
    }
    attribution[key]=value.trim();
  }
  if(body.company_website!=='')throw Error('Invalid inquiry.');
  return {submission_key,name,phone,service_id,travel_date,travelers,pickup:text('pickup',500),notes:text('notes',4000),attribution};
}
export async function submitInquiry(request,env) {
  const unavailable='Inquiry saving is temporarily unavailable. Please try again later.';
  if(request.method!=='POST')return reply({error:'Method not allowed.'},405);
  const origin=new URL(request.url).origin;
  if(request.headers.get('Origin')!==origin || (request.headers.get('Sec-Fetch-Site') && request.headers.get('Sec-Fetch-Site')!=='same-origin'))return reply({error:'Please open the inquiry from this website.'},403);
  if(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()!=='application/json')return reply({error:'Invalid request format.'},415);
  let endpoint;
  try{endpoint=new URL(env.CRM_INQUIRY_URL||'https://wanderdesk-crm.pages.dev/api/integrations/website/inquiries');}catch{return reply({error:unavailable},503);}
  if(endpoint.protocol!=='https:' || endpoint.username || endpoint.password || typeof env.WEBSITE_INQUIRY_SECRET!=='string' || !env.WEBSITE_INQUIRY_SECRET.trim() || /[\r\n]/.test(env.WEBSITE_INQUIRY_SECRET))return reply({error:unavailable},503);
  // The flag confirms an externally enforced WAF rule; it does not enforce a limit.
  if(env.INQUIRY_RATE_LIMITER != null)try{
    if(typeof env.INQUIRY_RATE_LIMITER.limit!=='function')return reply({error:unavailable},503);
    const ip=request.headers.get('CF-Connecting-IP');
    if(!ip)return reply({error:unavailable},503);
    const result=await env.INQUIRY_RATE_LIMITER.limit({key:ip});
    if(result.success!==true)return reply({error:'Too many inquiries. Please try again later.'},429);
  }catch{return reply({error:unavailable},503);}
  else if(env.INQUIRY_EDGE_RATE_LIMITED!=='true')return reply({error:unavailable},503);
  let body,payload;
  try{body=await readBody(request,16384);payload=validateInquiry(body);}catch(error){return reply({error:error.message==='body-size'?'Request body too large.':'Invalid inquiry. Please check your details.'},error.message==='body-size'?413:400);}
  try{
    const response=await fetch(endpoint.href,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.WEBSITE_INQUIRY_SECRET}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
    if(response.status===409)return reply({error:'Inquiry conflict. Edit your details and submit again.'},409);
    if(response.status!==200 && response.status!==201)return reply({error:'Could not save inquiry. Please retry.'},502);
    const result=await readBody(response,16384);
    if(result.status!=='received'||!uuid.test(result.inquiry_reference))return reply({error:'Could not confirm receipt. Please retry.'},502);
    return reply({inquiry_reference:result.inquiry_reference,status:'received'},response.status);
  }catch{return reply({error:'Could not confirm receipt. Please retry.'},502);}
}
export async function verifyContact(request,env) {
  if(request.method !== 'POST')return reply({error:'Method not allowed.'},405);
  const settings=config(env,request);
  if(!settings)return reply({error:unavailable},503);
  if(request.headers.get('Origin')!==settings.origin)return reply({error:'Please open the inquiry from this website.'},403);
  if(request.headers.get('Sec-Fetch-Site') && request.headers.get('Sec-Fetch-Site')!=='same-origin')return reply({error:'Please open the inquiry from this website.'},403);
  if(request.headers.get('Content-Type')?.split(';')[0].trim()!=='application/json')return reply({error:'Invalid request format.'},415);
  let body;
  try{body=await readBody(request);}catch{return reply({error:'Invalid request.'},400);}
  if(!body || typeof body!=='object' || Array.isArray(body) || typeof body.token!=='string' || !body.token.trim() || body.token.length>8192 || typeof body.company_website!=='string' || body.company_website!=='')return reply({error:'Please complete the human verification.'},400);
  try {
    const response=await fetch('https://www.google.com/recaptcha/api/siteverify',{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({secret:settings.secret,response:body.token}),
      signal:AbortSignal.timeout(10000)
    });
    if(!response.ok)return reply({error:unavailable},503);
    const verification=await response.json();
    // Google enforces token expiry and single use. Never trust a client-side checkbox state.
    if(verification.success!==true || typeof verification.hostname!=='string' || verification.hostname.toLowerCase()!==settings.hostname || !settings.hosts.includes(verification.hostname.toLowerCase()))return reply({error:'Verification expired or failed. Please check the box again.'},403);
    return reply({whatsappUrl:`https://wa.me/${settings.number}`});
  }catch{return reply({error:unavailable},503);}
}
const contentTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.yml':'text/yaml; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff2':'font/woff2'};
// Decap's configuration validator generates JavaScript at runtime. Scope that
// exception to the editor; public pages must continue to reject string eval.
export function contentSecurityPolicy({admin=false,allowChatGPT=false}={}) {
  const frameAncestors=!admin && allowChatGPT ? "'self' https://chatgpt.com" : "'self'";
  return "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://static.cloudflareinsights.com 'unsafe-inline'"+(admin?" 'unsafe-eval'":"")+"; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://api.github.com https://github.com https://cdn.jsdelivr.net https://www.google.com/recaptcha/ https://www.googletagmanager.com https://www.google.com https://www.google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://stats.g.doubleclick.net https://ad.doubleclick.net https://static.cloudflareinsights.com https://cloudflareinsights.com; frame-src 'self' blob: https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/ https://www.googletagmanager.com https://td.doubleclick.net; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors "+frameAncestors;
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(url.pathname==='/api/captcha-config')return getCaptchaConfig(request,env);
    if(url.pathname==='/api/contact')return verifyContact(request,env);
    if(url.pathname==='/api/inquiries')return submitInquiry(request,env);
    if(request.method!=='GET' && request.method!=='HEAD')return reply({error:'Method not allowed.'},405);
    if(url.pathname==='/admin')return new Response(null,{status:301,headers:{Location:'/admin/'}});
    if(url.pathname==='/index.html')return new Response(null,{status:301,headers:{Location:'/'+url.search}});
    const key=url.pathname==='/'?'/index.html':url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
    const found=EMBEDDED_ASSETS && Object.hasOwn(EMBEDDED_ASSETS,key);
    const item=EMBEDDED_ASSETS?.[found?key:'/404.html'];
    if(!item)return new Response('Not found',{status:404});
    const isAdmin=key.startsWith('/admin/');
    // Sites is shown inside ChatGPT. Permit that exact parent for public pages,
    // while keeping the CMS restricted to its own origin.
    const headers={
      'Content-Type':contentTypes[(found?key:'/404.html').match(/\.[^.]+$/)?.[0]]||'application/octet-stream',
      'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin',
      'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
      'Cache-Control':key.startsWith('/assets/')?'public, max-age=86400':'no-cache',
      'Content-Security-Policy':contentSecurityPolicy({admin:isAdmin,allowChatGPT:true})
    };
    if(isAdmin){headers['X-Robots-Tag']='noindex, nofollow';headers['X-Frame-Options']='SAMEORIGIN';}
    return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(item),c=>c.charCodeAt(0)),{status:found?200:404,headers});
  }
};
