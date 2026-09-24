(async () => {
  const message=document.getElementById('admin-message');
  try {
    const response=await fetch('/admin/config.yml',{cache:'no-store'});
    if(!response.ok)throw Error('The editor configuration could not be loaded.');
    const config=await response.text();
    if(config.includes('REPLACE_WITH_GITHUB_OWNER')){
      message.textContent='One-time setup required';
      document.getElementById('setup-instructions').hidden=false;
      return;
    }
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/decap-cms@3.16.3/dist/decap-cms.js';
    script.onload=()=>{document.getElementById('admin-status').hidden=true;};
    script.onerror=()=>{message.textContent='The editor could not be loaded. Check your connection and reload this page.';};
    document.head.append(script);
  } catch(error){message.textContent=error.message||'The content manager could not be loaded. Please reload.';}
})();
