export const COOKIE = '__Host-irisha_oauth';
export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export const noStore = {'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export const random = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b=>b.toString(16).padStart(2,'0')).join('');
export const failure = (message,status=400) => new Response(message,{status,headers:{...noStore,'Content-Type':'text/plain; charset=utf-8','Set-Cookie':clearCookie}});
export function configuration(env,request){
  if(!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.GITHUB_REPO || !env.SITE_URL)throw Error('CMS authentication is not configured.');
  const origin=new URL(env.SITE_URL).origin;
  if(!origin.startsWith('https://') || new URL(request.url).origin!==origin)throw Error('Use the configured CMS domain.');
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(env.GITHUB_REPO))throw Error('Invalid repository configuration.');
  return {origin,callback:origin+'/api/callback'};
}
export async function challenge(verifier){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
 return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
