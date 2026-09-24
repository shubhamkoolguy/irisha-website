import {COOKIE,noStore,random,configuration,challenge,failure} from '../../server/oauth.mjs';
export async function onRequestGet({request,env}) {
  try {
    const {origin,callback}=configuration(env,request);
    const siteId=new URL(request.url).searchParams.get('site_id');
    if(siteId && siteId!==new URL(origin).hostname && siteId!==origin)return failure('This CMS origin is not allowed.',403);
    const state=random();
    const verifier=random();
    const url=new URL('https://github.com/login/oauth/authorize');
    url.search=new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,redirect_uri:callback,scope:'repo',state,code_challenge:await challenge(verifier),code_challenge_method:'S256',allow_signup:'false'}).toString();
    return new Response(null,{status:302,headers:{...noStore,Location:url.href,'Set-Cookie':`${COOKIE}=${state}.${verifier}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`}});
  } catch { return failure('CMS authentication is not configured for this domain.',503); }
}
