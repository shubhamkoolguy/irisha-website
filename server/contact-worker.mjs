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
async function readBody(request) {
  if(Number(request.headers.get('Content-Length') || 0)>12288)throw Error('body-size');
  const reader=request.body?.getReader();
  if(!reader)throw Error('body');
  const chunks=[]; let size=0;
  try {
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>12288){await reader.cancel();throw Error('body-size');}chunks.push(value);}
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
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
  return "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ 'unsafe-inline'"+(admin?" 'unsafe-eval'":"")+"; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://api.github.com https://github.com https://cdn.jsdelivr.net https://www.google.com/recaptcha/; frame-src 'self' blob: https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors "+frameAncestors;
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(url.pathname==='/api/captcha-config')return getCaptchaConfig(request,env);
    if(url.pathname==='/api/contact')return verifyContact(request,env);
    if(request.method!=='GET' && request.method!=='HEAD')return reply({error:'Method not allowed.'},405);
    if(url.pathname==='/admin')return new Response(null,{status:301,headers:{Location:'/admin/'}});
    if(url.pathname==='/index.html')return new Response(null,{status:301,headers:{Location:'/'+url.search}});
    const key=url.pathname==='/'?'/index.html':url.pathname==='/admin/'?'/admin/index.html':url.pathname;
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
