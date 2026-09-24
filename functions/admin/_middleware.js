import {contentSecurityPolicy} from '../../server/contact-worker.mjs';

// Pages combines matching _headers policies, which cannot relax an inherited
// policy. Set one complete editor policy on the final HTML response instead.
export async function onRequest(context) {
  const response=await context.next();
  const pathname=new URL(context.request.url).pathname;
  if(pathname!=='/admin/' && pathname!=='/admin/index.html')return response;
  const headers=new Headers(response.headers);
  headers.set('Content-Security-Policy',contentSecurityPolicy({admin:true}));
  headers.set('X-Frame-Options','SAMEORIGIN');
  headers.set('X-Robots-Tag','noindex, nofollow');
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  headers.set('Cache-Control','no-cache');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
