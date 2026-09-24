import {COOKIE,clearCookie,noStore,random,configuration,failure} from '../../server/oauth.mjs';
export async function onRequestGet({request,env}) {
  let config;
  try {config=configuration(env,request);}catch{return failure('CMS authentication is not configured for this domain.',503);}
  const url=new URL(request.url);
  const code=url.searchParams.get('code');
  const state=url.searchParams.get('state');
  const cookie=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  const [saved,verifier]=(cookie||'').split('.');
  if(!code || !state || !saved || state!==saved || !/^[a-f0-9]{64}$/.test(saved) || !/^[a-f0-9]{64}$/.test(verifier||''))return failure('Your sign-in session expired or could not be verified. Close this window and sign in again.',403);
  try {
    const exchange=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,redirect_uri:config.callback,code,code_verifier:verifier}),signal:AbortSignal.timeout(15000)});
    if(!exchange.ok)return failure('GitHub sign-in could not be completed. Please try again.',502);
    const auth=await exchange.json();
    if(!auth.access_token)return failure('GitHub did not authorize this sign-in. Please try again.',403);
    const headers={'Accept':'application/vnd.github+json','Authorization':`Bearer ${auth.access_token}`,'User-Agent':'Irisha-Concierge-CMS','X-GitHub-Api-Version':'2022-11-28'};
    const [userResponse,repoResponse]=await Promise.all([
      fetch('https://api.github.com/user',{headers,signal:AbortSignal.timeout(15000)}),
      fetch('https://api.github.com/repos/'+env.GITHUB_REPO,{headers,signal:AbortSignal.timeout(15000)})
    ]);
    if(!userResponse.ok || !repoResponse.ok)return failure('Your GitHub account does not have access to this content repository.',403);
    const [user,repo]=await Promise.all([userResponse.json(),repoResponse.json()]);
    if(!user.id || !repo.permissions?.push)return failure('Only editors with write access to the content repository may sign in.',403);
    const nonce=random();
    const serialize=value=>JSON.stringify(value).replace(/</g,'\\u003c');
    const payload='authorization:github:success:'+JSON.stringify({token:auth.access_token,provider:'github'});
    const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign-in complete — Irisha Concierge</title><body><p>Completing your sign-in. You can close this window once the editor opens.</p><script nonce="${nonce}">const origin=${serialize(config.origin)};const payload=${serialize(payload)};function receive(event){if(event.origin!==origin||event.source!==window.opener||event.data!=='authorizing:github')return;window.removeEventListener('message',receive);window.opener.postMessage(payload,origin);window.close();}if(window.opener){window.addEventListener('message',receive);window.opener.postMessage('authorizing:github',origin);}else{document.querySelector('p').textContent='Open sign-in from the content manager and allow the sign-in popup.';}</script></body></html>`;
    return new Response(html,{headers:{...noStore,'Content-Type':'text/html; charset=utf-8','Set-Cookie':clearCookie,'X-Frame-Options':'DENY','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`}});
  } catch {return failure('GitHub is unavailable. Please close this window and try again.',502);}
}
