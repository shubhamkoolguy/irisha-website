import {readFile, writeFile, mkdir, readdir, copyFile, rm, cp} from 'node:fs/promises';
import path from 'node:path';
const root = new URL('../', import.meta.url).pathname;
process.chdir(root);
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const collection = async dir => (await Promise.all((await readdir(dir)).filter(f=>f.endsWith('.json')).map(f=>read(path.join(dir,f))))).filter(x=>x.active).sort((a,b)=>(a.order||0)-(b.order||0));
const settings=await read('content/settings.json');
const packages=await collection('content/packages');
const fleet=await collection('content/fleet');
const offers=await collection('content/offers');
const services=(await read('content/services.json')).items;
const featured=packages.find(x=>x.featured)||packages[0];
const vehicle=fleet.find(x=>x.featured)||fleet[0];
if(!featured||!vehicle) throw Error('At least one active package and vehicle are required.');
if('whatsapp' in settings || 'phone_display' in settings) throw Error('Contact details must be stored in runtime secrets, not public content.');
const e = s => String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nl=s=>e(s).replace(/\n/g,'<br>');
const safePath=s=>{if(!/^\/(?!\/)/.test(s||'')) throw Error('Images must use a local absolute path: '+s); return e(s);};
const itineraryMarkup = p => `<ol class="itinerary">${p.itinerary.map((day,i)=>`<li class="itinerary-stop"><span class="stop-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><div><p class="small-eyebrow">Day ${i+1} · ${e(day.place)}</p><h3>${e(day.title)}</h3><p>${e(day.description)}</p>${day.schedule?.length?`<dl class="itinerary-schedule">${day.schedule.map(slot=>`<div><dt>${e(slot.period)}</dt><dd>${e(slot.description)}</dd></div>`).join('')}</dl>`:''}${day.overnight?`<p class="itinerary-overnight"><strong>Overnight</strong> ${e(day.overnight)}</p>`:''}</div></li>`).join('')}</ol>`;
const money = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
const price = x => x.starting_price>0 ? `From ${money(x.starting_price)} <small>${e(x.price_unit)}</small>` : e(x.price_label);
const icons={
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 diagonal:'<path d="M6 18 18 6M6 6h12v12"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
 down:'<path d="m6 9 6 6 6-6"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 sparkle:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
 stay:'<path d="M4 21V5h11v16M15 10h5v11M2 21h20M8 9h3M8 13h3M8 17h3"/>',
 temple:'<path d="M4 21h16M6 21V11h12v10M4 11l8-7 8 7M12 4V1M10 21v-6h4v6"/>',
 boat:'<path d="m3 16 9-4 9 4-3 4H6l-3-4ZM12 12V3M12 3l7 7h-7M3 22c2-2 4 2 6 0s4 2 6 0 4 2 6 0"/>',
 globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
 passport:'<rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="10" r="4"/><path d="M8 10h8M12 6v8M9 18h6"/>',
 plane:'<path d="m22 2-7 20-4-9-9-4L22 2ZM11 13l6-6"/>',
 music:'<path d="M9 18V5l12-3v14M9 9l12-3"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>',
 seat:'<path d="M6 3v10a3 3 0 0 0 3 3h9M9 20h9M7 16v5M18 14v7M10 4v8h7"/>',
 users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 4v2"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 whatsapp:'<path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3 21l1.8-4.8a8.5 8.5 0 1 1 15.7-4.5Z"/><path d="M8 7c0 4 3 7 7 8l2-2-3-2-1 1c-1.5-.6-2.4-1.5-3-3l1-1-2-2-1 1Z"/>'
};
const icon=(name,cls='')=>`<svg class="icon ${cls}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.sparkle}</svg>`;
const wordmark=`<span class="brand-art" aria-hidden="true"><span class="brand-art-symbol"><img src="/assets/irisha-transparent-logo.png" width="1280" height="1391" alt=""></span><span class="brand-art-name"><img src="/assets/irisha-transparent-logo.png" width="1280" height="1391" alt=""></span></span>`;
const fullLogo=`<span class="brand-art-full" aria-hidden="true"><img src="/assets/irisha-transparent-logo.png" width="1280" height="1391" alt=""></span>`;
const seenSlugs=new Set();
for(const service of services){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(service.slug||'')) throw Error('Invalid service slug: '+service.slug);
  if(seenSlugs.has(service.slug)) throw Error('Duplicate service slug: '+service.slug);
  seenSlugs.add(service.slug);
}
const siteOrigin = new URL(settings.site_url);
if(siteOrigin.protocol !== 'https:' || siteOrigin.username || siteOrigin.password || siteOrigin.pathname !== '/' || siteOrigin.search || siteOrigin.hash) throw Error('Site URL must be an HTTPS origin.');
settings.site_url = siteOrigin.origin;
const seoTitle = settings.seo_title || `${settings.brand} — Private Pilgrimage Tours`;
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {'@type':'Organization','@id':`${settings.site_url}/#organization`,name:settings.brand,url:`${settings.site_url}/`,logo:`${settings.site_url}/assets/irisha-transparent-logo.png`,description:settings.description},
    {'@type':'WebSite','@id':`${settings.site_url}/#website`,url:`${settings.site_url}/`,name:settings.brand,inLanguage:'en',publisher:{'@id':`${settings.site_url}/#organization`}},
    {'@type':'WebPage','@id':`${settings.site_url}/#webpage`,url:`${settings.site_url}/`,name:seoTitle,description:settings.description,inLanguage:'en',isPartOf:{'@id':`${settings.site_url}/#website`},about:{'@id':`${settings.site_url}/#organization`}}
  ]
};
const now=Date.now();
const current=offers.filter(o=>(!o.starts_at||Date.parse(o.starts_at)<=now)&&(!o.ends_at||Date.parse(o.ends_at)>now));
const offer=current[0];
const fonts=`<script src="/theme.js"></script><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Noto+Sans+Devanagari:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">`;
const offerHref=raw=>{
  const href=/^(#[a-zA-Z][\w-]*|https:\/\/)/.test(raw||'')?raw:'#sacred-circuits';
  return href.startsWith('#')?'/'+href:href;
};
const nav=(home=true)=>{
  const to=id=>home?`#${id}`:`/#${id}`;
  return `<a href="${to('sacred-circuits')}">Sacred Circuits</a><a href="${to('elite-fleet')}">Elite Fleet</a><a href="${to('holidays')}">Services</a><a href="${to('contact')}">Contact</a>`;
};
const pageHead=({title,description,canonical,jsonLd,preload})=>`<!doctype html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0b0614">
<title>${e(title)}</title><meta name="description" content="${e(description)}">
<link rel="canonical" href="${e(canonical)}"><meta property="og:type" content="website"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(canonical)}">
<meta property="og:site_name" content="${e(settings.brand)}">
${jsonLd?`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g,'\\u003c')}</script>`:''}
<link rel="icon" type="image/svg+xml" href="/assets/irisha-transparent-favicon.svg">
${fonts}${preload?`<link rel="preload" as="image" href="${safePath(preload)}" fetchpriority="high">`:''}<link rel="stylesheet" href="/styles.css"><script src="/app.js" defer></script>
</head><body>`;
const chrome=(home=true)=>`<a class="skip-link" href="#main">Skip to content</a>
<div class="announcement" id="announcement" ${offer?'':'hidden'}><div class="announcement-inner"><span class="announcement-label" id="offer-label">${e(offer?.label)}</span><span id="offer-text">${e(offer?.text)}</span><a id="offer-link" href="${e(home?(/^(#[a-zA-Z][\w-]*|https:\/\/)/.test(offer?.href||'')?offer.href:'#sacred-circuits'):offerHref(offer?.href))}">${e(offer?.cta)} ${icon('arrow')}</a><button class="icon-button offer-pause" id="offer-pause" aria-label="Pause offers" hidden>Ⅱ</button></div></div>
<header class="site-header"><div class="nav-wrap"><a class="brand" href="/" aria-label="Irisha Concierge home">${wordmark}</a><nav class="desktop-nav" aria-label="Main navigation">${nav(home)}</nav><button class="button button-small nav-cta" data-contact>${icon('whatsapp')} Inquire on WhatsApp</button><button type="button" class="theme-toggle" data-theme-toggle aria-label="Appearance: System. Switch to light mode"><span aria-hidden="true" class="theme-symbol">◐</span><span class="theme-label">System</span></button><button class="menu-toggle icon-button" aria-controls="mobile-nav" aria-expanded="false" aria-label="Open navigation">${icon('menu')}</button></div><nav id="mobile-nav" class="mobile-nav" aria-label="Mobile navigation" hidden>${nav(home)}<button class="mobile-inquire" data-contact>Inquire on WhatsApp ${icon('whatsapp')}</button></nav></header>`;
const contactBlock=`<section class="contact-section" id="contact"><div class="contact-glow"></div><div class="container contact-inner"><span class="contact-star" aria-hidden="true">✧</span><p class="eyebrow">YOUR NEXT CHAPTER</p><h2>${e(settings.contact_heading).replace('with a conversation.','<br><em>with a conversation.</em>')}</h2><p>${e(settings.contact_description)}</p><button class="button" data-contact>${icon('whatsapp')} Let’s talk on WhatsApp ${icon('arrow')}</button><span class="contact-note">A personal conversation. A journey made for you.</span><noscript><p class="contact-note">Please enable JavaScript to use secure contact verification.</p></noscript><div id="contact-verification" class="contact-verification" role="region" aria-labelledby="verification-title" hidden>
<div class="verification-heading"><h3 id="verification-title" tabindex="-1">Before we connect.</h3><button type="button" id="verification-cancel" class="icon-button" aria-label="Cancel verification">${icon('close')}</button></div>
<p class="verification-description">Confirm you’re human to connect with your concierge.</p>
<div class="form-trap" aria-hidden="true"><label>Leave this field empty<input id="contact-company" type="text" tabindex="-1" autocomplete="off"></label></div>
<div class="captcha-stage"><div id="captcha-widget"></div></div>
<p id="captcha-status" class="captcha-status" role="status" aria-live="polite">Loading secure verification…</p><button type="button" id="captcha-retry" class="text-link" hidden>Try verification again</button>
<button class="button" type="button" id="verified-contact" disabled>${icon('whatsapp')} Continue on WhatsApp ${icon('arrow')}</button><p class="captcha-legal">Protected by reCAPTCHA. Google’s <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> apply.</p></div></div></section>`;
const pageClose=`</main><footer class="site-footer container"><div class="footer-top"><a class="brand" href="/" aria-label="Irisha Concierge home">${fullLogo}</a><p lang="hi" class="hindi">${e(settings.tagline)}</p><a href="#main" class="back-top">Back to top ${icon('arrow')}</a></div><div class="footer-bottom"><p>© ${new Date().getFullYear()} ${e(settings.brand)}. All rights reserved.</p><div><button class="footer-link" data-policy="privacy">Privacy</button><button class="footer-link" data-policy="terms">Booking information</button><span>Thoughtfully curated in India.</span></div></div></footer>
<button class="floating-whatsapp" data-contact aria-label="Chat with Irisha Concierge on WhatsApp">${icon('whatsapp')}</button>
<dialog id="detail-dialog" class="detail-dialog" aria-labelledby="detail-title"><button class="dialog-close icon-button" data-close aria-label="Close details">${icon('close')}</button><div id="detail-content"></div></dialog>
<dialog id="inquiry-dialog" class="inquiry-dialog" aria-labelledby="inquiry-title"><button class="dialog-close icon-button" data-close aria-label="Close inquiry">${icon('close')}</button><p class="eyebrow">A JOURNEY THAT’S YOURS</p><h2 id="inquiry-title">Let’s make it <em>personal.</em></h2><p class="dialog-description">A few details are all we need to begin. Your concierge will take it from here.</p><form id="inquiry-form"><label>I'm interested in<select name="interest" id="interest">${[...packages.map(x=>x.title),...fleet.map(x=>x.title),...services.map(x=>x.title)].map(x=>`<option>${e(x)}</option>`).join('')}</select></label><div class="form-row"><label>Your name <span>(required)</span><input name="name" autocomplete="given-name" placeholder="How should we address you?" maxlength="80" required></label><label>Guests<select name="guests"><option value="Not decided">Not decided yet</option><option>1–2 guests</option><option>3–6 guests</option><option>7–10 guests</option><option>11–16 guests</option><option>17+ guests</option></select></label></div><label>Preferred travel date <span>(optional)</span><input type="date" name="date" id="travel-date"></label><label>Anything you’d like us to know? <span>(optional)</span><textarea name="notes" rows="3" maxlength="1500" placeholder="Your pickup city, special puja, occasion or a little wish…"></textarea></label><div class="form-trap" aria-hidden="true"><label>Leave this field empty<input name="company_website" type="text" tabindex="-1" autocomplete="off"></label></div><button class="button form-submit" type="submit">Continue securely ${icon('arrow')}</button><p class="form-note">After verification, WhatsApp opens with your trip details. Nothing is sent until you choose to send it. Protected by reCAPTCHA: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy</a> · <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Terms</a>.</p></form></dialog>
<script type="application/json" id="site-data">${JSON.stringify({settings,packages,fleet,services,offers}).replace(/</g,'\u003c')}</script>
</body></html>`;
const html=`${pageHead({title:seoTitle,description:settings.description,canonical:`${settings.site_url}/`,jsonLd:structuredData,preload:settings.hero_image})}
${chrome(true)}
<main id="main" tabindex="-1">
<section class="hero" aria-labelledby="hero-title"><img class="hero-image" src="${safePath(settings.hero_image)}" alt="${e(settings.hero_image_alt)}" width="1920" height="1080" fetchpriority="high"><div class="hero-shade"></div><div class="hero-content"><h1 id="hero-title">${e(settings.hero_heading)} <span class="hero-heading-second">${e(settings.hero_heading_second)}</span></h1><p class="hero-spec">${e(settings.hero_spec)}</p><p class="hero-description">${e(settings.hero_description)}</p><div class="hero-actions"><button class="button" data-inquire="${e(featured.title)}">${e(settings.hero_cta)} ${icon('arrow')}</button></div></div></section>
<div class="promise-strip container"><span>${icon('sparkle')} Journeys made personal</span><span>${icon('temple')} Thoughtful local expertise</span><span>${icon('users')} One dedicated concierge</span></div>
<section class="section container sacred-section" id="sacred-circuits" aria-labelledby="sacred-title"><div class="section-heading split-heading"><div><p class="eyebrow">THE SACRED, BEAUTIFULLY REIMAGINED</p><h2 id="sacred-title">Private pilgrimage tours<br><em>across three sacred cities.</em></h2></div><p>Be fully present in the moments that matter.<br>We’ll take care of everything around them.</p></div>
<article class="signature-card">
<div class="signature-photo"><img src="${safePath(featured.image)}" alt="${e(featured.image_alt)}" width="900" height="1200" loading="lazy"><span class="signature-badge">${icon('sparkle')}${e(featured.eyebrow)}</span><div class="photo-caption"><span>${e(featured.image_caption)}</span><p>Devotion, without distraction.</p></div></div>
<div class="signature-content"><div class="destination-list">${featured.destinations.map(x=>`<span>${e(x)}</span>`).join('<i aria-hidden="true">·</i>')}</div><h3>${nl(featured.headline)}</h3>
<p class="package-duration"><strong>${e(featured.duration)}</strong>${featured.duration_note?`<span>${e(featured.duration_note)}</span>`:''}</p><p class="card-description">${e(featured.description)}</p>
<div class="inclusion-grid">${featured.inclusions.map(x=>`<div class="inclusion">${icon(x.icon)}<div><h4>${e(x.title)}</h4><p>${e(x.description)}</p></div></div>`).join('')}</div>
<p class="package-conditions">${e(featured.notes)}</p>
<div class="signature-bottom"><div><span class="small-eyebrow">YOUR PRIVATE PILGRIMAGE</span><p class="quote-price">${price(featured)}</p></div><button class="button" data-inquire="${e(featured.title)}">Request Private Itinerary &amp; Quote ${icon('arrow')}</button></div>
</div></article>
${featured.price_guidance||featured.exclusions?.length?`<div class="package-booking-details">${featured.price_guidance?`<div><h3>Your personalised quote</h3><p>${e(featured.price_guidance)}</p></div>`:''}${featured.exclusions?.length?`<div><h3>Not included</h3><ul>${featured.exclusions.map(x=>`<li>${e(x)}</li>`).join('')}</ul></div>`:''}</div>`:''}
<details class="package-itinerary" id="signature-itinerary"><summary><span>Explore your daily itinerary</span>${icon('chevron')}</summary><div class="package-itinerary-body">${featured.itinerary_note?`<p class="itinerary-intro">${e(featured.itinerary_note)}</p>`:''}${itineraryMarkup(featured)}<button class="button detail-cta" data-inquire="${e(featured.title)}">Request Private Itinerary &amp; Quote ${icon('arrow')}</button></div></details>
${packages.filter(x=>x!==featured).length?`<div class="more-packages">${packages.filter(x=>x!==featured).map(x=>`<button class="secondary-vehicle" data-package="${e(x.slug)}"><span><span class="small-eyebrow">${e(x.eyebrow)}</span><strong>${e(x.title)}</strong><small>${price(x)}</small></span>${icon('arrow')}</button>`).join('')}</div>`:''}
</section>
<section class="section fleet-section" id="elite-fleet" aria-labelledby="fleet-title"><div class="container"><div class="section-heading centered"><p class="eyebrow">THE ART OF ARRIVING</p><h2 id="fleet-title">Private chauffeur-driven<br><em>transfers &amp; travel.</em></h2><p>Your own space. Your own pace. A finer way to travel.</p></div><div class="fleet-card"><div class="fleet-visual"><div class="fleet-visual-heading"><span class="small-eyebrow">THE ELITE FLEET</span><span class="seats-label">${icon('users')}${e(vehicle.seats)}</span></div><span class="fleet-watermark" aria-hidden="true">${e(vehicle.title.replace('Force ',''))}</span>${vehicle.image?`<img src="${safePath(vehicle.image)}" alt="${e(vehicle.image_alt)}" width="1920" height="734" loading="lazy">`:''}<p class="vehicle-caption">${e(vehicle.image_note)}</p></div><div class="fleet-content"><p class="eyebrow">${e(vehicle.category)}</p><h3>${e(vehicle.title)}</h3><p class="fleet-subtitle">${e(vehicle.audience)}</p><p class="card-description">${e(vehicle.description)}</p><ul class="fleet-features">${vehicle.features.map((x,i)=>`<li>${icon(i===0?'seat':i===1?'users':i===2?'sparkle':'check')}<span>${e(x)}</span></li>`).join('')}</ul><div class="fleet-actions"><button class="text-link" data-vehicle="${e(vehicle.slug)}">Explore this vehicle ${icon('diagonal')}</button><button class="button button-outline" data-inquire="${e(vehicle.title)}">Request a quote ${icon('arrow')}</button></div><p class="fleet-price">${price(vehicle)}</p></div></div><div class="secondary-fleet">${fleet.filter(x=>x!==vehicle).map(x=>`<button class="secondary-vehicle" data-vehicle="${e(x.slug)}"><div class="vehicle-icon">${icon('seat')}</div><span><span class="small-eyebrow">${e(x.category)}</span><strong>${e(x.title)}</strong><small>${e(x.seats)} · ${price(x)}</small></span><span class="circle-arrow">${icon('diagonal')}</span></button>`).join('')}</div></div></section>
<section class="section container services-section" id="holidays" aria-labelledby="services-title"><div class="section-heading split-heading"><div><p class="eyebrow">ONE CONCIERGE. ENDLESS POSSIBILITIES.</p><h2 id="services-title">Holidays &amp; travel<br><em>concierge services.</em></h2></div><p>From a change of scenery to a celebration.<br>Every detail, beautifully in place.</p></div><div class="bento-grid">${services.map(x=>`<a class="service-card ${x.large?'service-large':''}" href="/services/${e(x.slug)}/"><span class="service-top">${icon(x.icon)}<span class="circle-arrow">${icon('diagonal')}</span></span><span class="service-copy"><span class="small-eyebrow">${e(x.eyebrow)}</span><strong>${e(x.title)}</strong><span class="service-description">${e(x.description)}</span></span>${x.large?`<span class="service-extra">A LITTLE WONDER. A WORLD OF POSSIBILITIES.</span>`:''}</a>`).join('')}</div></section>
${contactBlock}
${pageClose}`;
const servicePage=s=>{
  const url=`${settings.site_url}/services/${s.slug}/`;
  const title=`${s.title} | ${settings.brand}`;
  const others=services.filter(x=>x!==s);
  const jsonLd={'@context':'https://schema.org','@graph':[
    {'@type':'Organization','@id':`${settings.site_url}/#organization`,name:settings.brand,url:`${settings.site_url}/`},
    {'@type':'WebPage','@id':`${url}#webpage`,url,name:title,description:s.details,inLanguage:'en',isPartOf:{'@id':`${settings.site_url}/#website`},about:{'@id':`${settings.site_url}/#organization`}},
    {'@type':'Service',name:s.title,description:s.details,provider:{'@id':`${settings.site_url}/#organization`},url}
  ]};
  return `${pageHead({title,description:s.details,canonical:url,jsonLd})}
${chrome(false)}
<main id="main" tabindex="-1">
<article class="service-page">
<div class="container service-page-hero">
<p class="eyebrow">${e(s.eyebrow)}</p>
<h1 id="hero-title">${e(s.title)}</h1>
<p class="service-page-lead">${e(s.details)}</p>
<div class="hero-actions"><button class="button" data-inquire="${e(s.title)}">Enquire about ${e(s.title)} ${icon('arrow')}</button></div>
</div>
${s.highlights?.length?`<div class="container inclusion-grid service-page-grid">${s.highlights.map(x=>`<div class="inclusion">${icon('sparkle')}<div><h2>${e(x.title)}</h2><p>${e(x.description)}</p></div></div>`).join('')}</div>`:''}
<div class="container service-page-columns">
${s.process?.length?`<div><h2>How it works</h2><ol class="service-steps">${s.process.map((step,n)=>`<li><span class="stop-number" aria-hidden="true">${String(n+1).padStart(2,'0')}</span><p>${e(step)}</p></li>`).join('')}</ol></div>`:''}
${s.needed?.length?`<div><h2>What to share</h2><ul class="package-inclusion-list">${s.needed.map(x=>`<li><span>${e(x)}</span></li>`).join('')}</ul></div>`:''}
</div>
${s.notes?`<p class="container package-conditions">${e(s.notes)}</p>`:''}
${others.length?`<div class="container more-packages service-page-more"><h2>Other concierge services</h2>${others.map(x=>`<a class="secondary-vehicle" href="/services/${e(x.slug)}/"><span><span class="small-eyebrow">${e(x.eyebrow)}</span><strong>${e(x.title)}</strong><small>${e(x.description)}</small></span>${icon('arrow')}</a>`).join('')}</div>`:''}
</article>
${contactBlock}
${pageClose}`;
};
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await cp('public', 'dist', {recursive:true});
await mkdir('dist/assets',{recursive:true});
await cp('assets', 'dist/assets', {recursive:true});
await writeFile('dist/index.html',html);
await mkdir('dist/services',{recursive:true});
for(const service of services){
  await mkdir(`dist/services/${service.slug}`,{recursive:true});
  await writeFile(`dist/services/${service.slug}/index.html`,servicePage(service));
}
await mkdir('dist/admin',{recursive:true});
for(const f of ['index.html','config.yml','admin.js']) await copyFile('admin/'+f,'dist/admin/'+f);
await writeFile('dist/robots.txt',`User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${settings.site_url}/sitemap.xml\n`);
await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${e(settings.site_url)}/</loc></url>${services.map(s=>`<url><loc>${e(settings.site_url)}/services/${e(s.slug)}/</loc></url>`).join('')}</urlset>`);
await writeFile('dist/404.html','<!doctype html><html lang="en"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found — Irisha Concierge</title><script src="/theme.js"></script><link rel="stylesheet" href="/styles.css"><body><main class="error-page"><p class="eyebrow">IRISHA CONCIERGE · 404</p><h1>A different path<br>awaits.</h1><p>This page could not be found.</p><a class="button" href="/">Return to Irisha</a></main></body></html>');
console.log(`Built Irisha Concierge: ${packages.length} packages, ${fleet.length} vehicles, ${services.length} services, ${offers.length} offers.`);
