'use strict';
(() => {
  const data = JSON.parse(document.getElementById('site-data').textContent);
  const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byId = id => document.getElementById(id);
  const detail = byId('detail-dialog');
  const inquiry = byId('inquiry-dialog');
  const menu = document.querySelector('.menu-toggle');
  const mobileNav = byId('mobile-nav');
  const price = item => item.starting_price > 0 ? `From ${new Intl.NumberFormat('en-IN', {style:'currency', currency:'INR', maximumFractionDigits:0}).format(item.starting_price)} ${item.price_unit}` : item.price_label;
  let returnFocus;

  function closeMenu() {
    menu.setAttribute('aria-expanded','false');
    menu.setAttribute('aria-label','Open navigation');
    mobileNav.hidden = true;
  }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded',String(open));
    menu.setAttribute('aria-label',open ? 'Close navigation' : 'Open navigation');
    mobileNav.hidden = !open;
  });
  mobileNav.querySelectorAll('a,button').forEach(link => link.addEventListener('click',closeMenu));
  document.addEventListener('keydown', event => {if(event.key === 'Escape' && !mobileNav.hidden){closeMenu();menu.focus();}});
  window.matchMedia('(min-width: 1051px)').addEventListener('change', event => {if(event.matches)closeMenu();});

  function openDialog(dialog, trigger) {
    if (trigger) returnFocus = trigger;
    document.body.classList.add('dialog-open');
    dialog.showModal();
    dialog.scrollTop = 0;
  }
  [detail,inquiry].forEach(dialog => {
    dialog.querySelector('[data-close]').addEventListener('click',() => dialog.close());
    dialog.addEventListener('click',event => {
      if(event.target !== dialog)return;
      const r = dialog.getBoundingClientRect();
      if(event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)dialog.close();
    });
    dialog.addEventListener('close',() => {
      if(!detail.open && !inquiry.open){document.body.classList.remove('dialog-open');returnFocus?.focus();}
    });
  });
  // Travel date is typed as DD/MM/YYYY; validate it is a real date, not in the past.
  const travelDate = byId('travel-date');
  travelDate.addEventListener('input', () => {
    const digits = travelDate.value.replace(/\D/g,'').slice(0,8);
    travelDate.value = [digits.slice(0,2), digits.slice(2,4), digits.slice(4)].filter(Boolean).join('/');
    const [dd,mm,yyyy] = travelDate.value.split('/').map(Number);
    const parsed = new Date(yyyy, mm-1, dd);
    const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
    const valid = !travelDate.value || (travelDate.value.length === 10 && parsed.getFullYear() === yyyy && parsed.getMonth() === mm-1 && parsed.getDate() === dd);
    travelDate.setCustomValidity(!valid ? 'Enter a valid date as DD/MM/YYYY.' : (travelDate.value && parsed < startOfToday ? 'Travel date cannot be in the past.' : ''));
  });
  function inquire(interest, trigger) {
    if(detail.open) detail.close();
    const select = byId('interest');
    const normalized=interest==='Innova Crysta Hire in Varanasi' || interest==='Innova Hycross Hire in Varanasi' ? 'Innova Hycross & Crysta Rental in Varanasi' : interest;
    const chosen=[...select.options].find(option => option.textContent === normalized);
    if(chosen)select.value = chosen.value;
    const path=location.pathname;
    const preferred=path.includes('/sacred-circuits/varanasi-')?'The Sacred Triangle':path.includes('/sacred-circuits/nalanda-')?'Nalanda, Gaya & Bodhgaya':path.includes('/elite-fleet/force-')?'Force Urbania':path.includes('/elite-fleet/innova-')?'Innova Hycross & Crysta Rental in Varanasi':null;
    const preferredOption=[...select.options].find(option=>option.textContent===preferred);
    if(preferredOption)select.value=preferredOption.value;
    openDialog(inquiry, trigger);
  }
  const action = label => `<button class="button detail-cta" data-inquire="${e(label)}">Personalise my ${data.fleet.some(x=>x.title===label)?'ride':'journey'} <span aria-hidden="true">→</span></button>`;
   const privacyCopy = `<p>Submitting requests a save of your name, phone, selected service, travel date, traveler count, pickup and notes in Irisha's CRM so we can contact you about your trip. An inquiry is not a booking. We also save allowlisted campaign parameters and the landing page without its query or fragment. Inquiry details and retry keys stay in memory, not browser storage.</p><p>After confirmed receipt, WhatsApp opens with your full details and reference. Continue on WhatsApp remains available if opening fails. If saving or verification fails, you can click a direct WhatsApp fallback with your details but no confirmed receipt or reference. Nothing is sent in WhatsApp automatically. Avoid passport numbers, payment details and sensitive documents in your inquiry.</p><h3>Third-party services</h3><p>Cloudflare hosts the website and processes technical request information; Google reCAPTCHA processes device and interaction information and may use cookies to prevent abuse under Google's privacy terms. WhatsApp applies its own terms when used. Google Fonts, Google Tag Manager and Google Ads are present. Appearance preference alone is stored locally.</p><p>For access, correction or deletion requests, email concierge@irisha.co.in.</p>`;
  const bookingCopy = `<p>Every journey is tailored to your dates, group and preferences. An inquiry is not a confirmed reservation or payment.</p><h3>Your quote</h3><p>Your concierge confirms itinerary, accommodation, vehicle configuration, inclusions, exclusions, taxes, payment schedule, amendments, cancellation terms and refund terms in writing before booking. No booking is confirmed until your concierge confirms it in writing.</p><h3>Sacred experiences</h3><p>Darshan coordination is subject to temple rules, official procedures and availability. Ritual coordination and private boat arrangements are available on request and subject to availability, local permissions and provider conditions.</p><h3>Flights and other providers</h3><p>Flights are excluded from the Sacred Triangle package and can be booked on request. Airfare, baggage, schedule changes, cancellations and refunds follow the airline’s rules. Other third-party experiences follow the relevant provider’s conditions. Review your written quotation and booking confirmation for the applicable terms before paying.</p>`;
  const packageItinerary = p => `<ol class="itinerary">${p.itinerary.map((day,i)=>`<li class="itinerary-stop"><span class="stop-number" aria-hidden="true">${String(day.day||i+1).padStart(2,'0')}</span><div><p class="small-eyebrow">${e(day.day_label||`Day ${day.day||i+1}`)} · ${e(day.place)}</p><h3>${e(day.title)}</h3><p>${e(day.description)}</p>${day.schedule?.length?`<dl class="itinerary-schedule">${day.schedule.map(slot=>`<div><dt>${e(slot.period)}</dt><dd>${e(slot.description)}</dd></div>`).join('')}</dl>`:''}${day.overnight?`<p class="itinerary-overnight"><strong>Overnight</strong> ${e(day.overnight)}</p>`:''}</div></li>`).join('')}</ol>`;
  function showDetail(type, key, trigger) {
    let html = '';
    if(type === 'package') {
      const p = data.packages.find(x=>x.slug===key);
      if(!p)return;
      html = `<p class="eyebrow">${e(p.eyebrow)}</p><h2 id="detail-title">${e(p.title)}</h2><div class="detail-route">${p.destinations.map(x=>`<span>${e(x)}</span>`).join('')}</div><p class="dialog-description">${e(p.description)}</p><p class="detail-price">${e(p.duration)} · ${e(price(p))}</p>${p.duration_note?`<p class="dialog-description">${e(p.duration_note)}</p>`:''}<h3 class="detail-subheading">Included in your journey</h3><ul class="package-inclusion-list">${p.inclusions.map(x=>`<li><strong>${e(x.title)}</strong><span>${e(x.description)}</span></li>`).join('')}</ul><p class="detail-note">${e(p.notes)}</p>${p.price_guidance||p.exclusions?.length?`<div class="package-booking-details">${p.price_guidance?`<div><h3>Your personalised quote</h3><p>${e(p.price_guidance)}</p></div>`:''}${p.exclusions?.length?`<div><h3>Not included</h3><ul>${p.exclusions.map(x=>`<li>${e(x)}</li>`).join('')}</ul></div>`:''}</div>`:''}${p.itinerary_note?`<p class="itinerary-intro">${e(p.itinerary_note)}</p>`:''}${packageItinerary(p)}<button class="button detail-cta" data-inquire="${e(p.title)}">Request Private Itinerary &amp; Quote <span aria-hidden="true">→</span></button>`;
    } else if(type === 'vehicle') {
      const v = data.fleet.find(x=>x.slug===key);
      if(!v)return;
      html = `<p class="eyebrow">${e(v.category)}</p><h2 id="detail-title">${e(v.title)}</h2><div class="detail-route"><span>${e(v.seats)}</span></div><p class="dialog-description">${e(v.description)}</p><ul class="detail-features">${v.features.map(x=>`<li>${e(x)}</li>`).join('')}</ul><p class="dialog-description">${e(v.details)}</p><p class="detail-price">${e(price(v))}</p>${action(v.title)}`;
    } else if(type === 'policy') {
      const privacy = key === 'privacy';
      html = `<p class="eyebrow">IRISHA CONCIERGE</p><h2 id="detail-title">${privacy?'Your privacy.':'Before you travel.'}</h2><div class="legal-copy">${privacy?`<p>This site’s inquiry form prepares your travel message on your device. The message is not sent to our website server or stored in browser storage. You decide whether to send it in WhatsApp. Before opening WhatsApp, we verify a reCAPTCHA token on our server to help prevent automated contact harvesting.</p><h3>When you contact us</h3><p>The details you choose to share are used to discuss and arrange your travel. Avoid including passport numbers, payment details or other sensitive documents in your first inquiry.</p><h3>Third-party services</h3><p>WhatsApp applies its own privacy terms when you open or use it. Site hosting providers may process technical request information. Web fonts are delivered through Google Fonts. This site does not include advertising or analytics trackers. Your light or dark appearance preference is stored locally on this device; it contains no inquiry details. When you open contact verification, Google reCAPTCHA processes device and interaction information and may use cookies to assess automated activity under Google’s Privacy Policy and Terms of Service.</p><p>For questions about information you have shared, use the protected contact option on this website to reach Irisha Concierge.</p>`:`<p>Every journey is tailored to your dates, group and preferences. An inquiry is not a confirmed reservation or payment.</p><h3>Your quote</h3><p>Your concierge will confirm the itinerary, accommodation, vehicle configuration, inclusions, exclusions, taxes, payment schedule and cancellation terms in writing before you book.</p><h3>Sacred experiences</h3><p>We guarantee our VIP Darshan coordination and assistance. Access, queue arrangements, puja availability and timings remain subject to temple authorities. Boat journeys and Aarti viewing are subject to river conditions and local permissions.</p><h3>Changes and cancellations</h3><p>Hotel, airline, venue and transport policies vary. The policies for your specific arrangements will be included in your quotation and booking confirmation.</p>`}</div>`;
    }
    if(type === 'policy'){
      const privacy=key==='privacy';
      html=`<p class="eyebrow">IRISHA CONCIERGE</p><h2 id="detail-title">${privacy?'Your privacy.':'Before you travel.'}</h2><div class="legal-copy">${privacy?privacyCopy:bookingCopy}</div>`;
    }
    byId('detail-content').innerHTML = html;
    openDialog(detail, trigger);
  }
  document.addEventListener('click',event => {
    const button = event.target.closest('[data-contact],[data-inquire],[data-package],[data-vehicle],[data-policy]');
    if(!button)return;
    if(button.hasAttribute('data-contact')){inquire(document.querySelector('h1')?.textContent||'Private journey',button);return;}
    if(button.hasAttribute('data-inquire'))inquire(button.dataset.inquire, button.closest('dialog') ? returnFocus : button);
    else if(button.hasAttribute('data-package'))location.assign(button.dataset.package==='sacred-triangle'?'/sacred-circuits/varanasi-prayagraj-ayodhya-tour/':'/sacred-circuits/nalanda-gaya-bodhgaya-tour/');
    else for(const type of ['vehicle','policy'])if(button.hasAttribute('data-'+type)){showDetail(type,button.dataset[type],button);break;}
  });
  const form=byId('inquiry-form');
  const status=byId('inquiry-status'), whatsapp=byId('inquiry-whatsapp'), verification=byId('inquiry-verification');
  const attribution={};
  const params=new URLSearchParams(location.search);
  for(const key of ['gclid','utm_source','utm_medium','utm_campaign','utm_term','utm_content']){
    const value=params.get(key);
    if(value && value.length<=500 && !/[\u0000-\u001f]/.test(value))attribution[key]=value;
  }
  attribution.landing_page_url=location.origin+location.pathname;
   let pending, fingerprint, saved, serviceLabel, busy=false, widget, captchaReady;
   const edited=()=>{whatsapp.hidden=true;status.textContent='';};
  form.addEventListener('input',edited);
  form.addEventListener('change',edited);
  byId('verification-cancel').addEventListener('click',()=>{if(busy)return;verification.hidden=true;openDialog(inquiry);});
   function showWhatsApp(reference){
     const message=['Namaste Irisha Concierge, I would like to plan a journey.',
       `Name: ${pending.name}`,`Phone: ${pending.phone}`,`Service: ${serviceLabel}`,
       `Travelers: ${pending.travelers ?? 'Not decided yet'}`,
       `Travel date: ${pending.travel_date ? pending.travel_date.split('-').reverse().join('/') : 'Not decided yet'}`,
       `Pickup: ${pending.pickup || 'Not specified'}`,`Notes: ${pending.notes || 'None'}`,
       ...(reference ? [`Inquiry reference: ${reference}`] : [])].join('\n');
     whatsapp.href='https://wa.me/919966320256?text='+encodeURIComponent(message);
     whatsapp.textContent=reference?'Continue on WhatsApp':'Open WhatsApp directly (receipt unconfirmed)';
     whatsapp.hidden=false;
     return whatsapp.href;
   }
   function fallback(message){
     status.textContent=message+' CRM receipt is unconfirmed. Retry saving, or click the direct WhatsApp link to share your details. Nothing is sent automatically.';
     showWhatsApp();
   }
   async function save(token){
     if(busy||saved)return;
     busy=true;
     let url;
    byId('verification-status').textContent='Saving inquiry...';
    try{
      const response=await fetch('/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...pending,token,company_website:form.elements.company_website.value}),signal:AbortSignal.timeout(15000)});
      const result=await response.json();
      if(!response.ok)throw Error(result.error || 'Could not confirm receipt. Please retry.');
      if(![200,201].includes(response.status)||result.status!=='received'||!/^[0-9a-f-]{36}$/i.test(result.inquiry_reference))throw Error('Could not confirm receipt. Please retry.');
      saved=result.inquiry_reference;
      status.textContent='Inquiry received. Reference: '+saved;
       url=showWhatsApp(saved);
       window.gtag?.('event','inquiry_received');
     }catch(error){if(!saved)fallback(error.name==='TimeoutError'||error.name==='AbortError'||error instanceof TypeError?'Could not confirm receipt. Please retry.':error.message);}
     finally{busy=false;verification.hidden=true;window.grecaptcha?.reset(widget);openDialog(inquiry);}
     if(url){try{location.assign(url);}catch{status.textContent='Inquiry received. Reference: '+saved+'. Click Continue on WhatsApp to open your message.';}}
  }
  form.addEventListener('submit',async event => {
    event.preventDefault();
    if(busy||!form.reportValidity())return;
    const values = new FormData(form);
    if(values.get('company_website'))return;
    const payload={name:values.get('name').trim(),phone:values.get('phone').trim(),service_id:values.get('interest'),travel_date:values.get('date')?values.get('date').split('/').reverse().join('-'):null,travelers:values.get('guests')?Number(values.get('guests')):null,pickup:values.get('pickup').trim(),notes:values.get('notes').trim(),attribution};
    const next=JSON.stringify(payload);
     if(next!==fingerprint){pending={submission_key:crypto.randomUUID(),...payload};fingerprint=next;saved=null;}
     serviceLabel=form.elements.interest.selectedOptions[0].textContent;
     if(saved){status.textContent='Inquiry received. Reference: '+saved;showWhatsApp(saved);return;}
     whatsapp.hidden=true;
    inquiry.close();verification.hidden=false;
    byId('verification-status').textContent='Complete human verification to save your inquiry.';
    try{
      if(!captchaReady)captchaReady=(async()=>{
        const response=await fetch('/api/captcha-config',{signal:AbortSignal.timeout(10000)});
        const config=await response.json();
        if(!response.ok||!config.configured)throw Error('Inquiry verification is unavailable. Please retry later.');
        await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(Error('Verification load timed out.')),10000);
          window.irishaCaptchaLoaded=()=>{clearTimeout(timer);resolve();};
          const script=document.createElement('script');
          script.src='https://www.google.com/recaptcha/api.js?onload=irishaCaptchaLoaded&render=explicit';script.onerror=()=>{clearTimeout(timer);reject(Error('Verification load failed.'));};
          document.head.append(script);
        });
         widget=window.grecaptcha.render('captcha-widget',{sitekey:config.siteKey,callback:save,'error-callback':()=>{if(busy||saved)return;verification.hidden=true;fallback('Inquiry verification failed.');openDialog(inquiry);}});
      })();
      await captchaReady;
     }catch{captchaReady=null;verification.hidden=true;fallback('Inquiry verification is unavailable. Please retry later.');openDialog(inquiry);}
   });

  // Resolve offer schedules on the visitor's clock too, so an expired offer
  // disappears without waiting for another static deployment.
  let offerIndex = 0;
  let userPaused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let hovering = false;
  let paused = userPaused;
  let currentOffers = [];
  const bar = byId('announcement');
  const pause = byId('offer-pause');
  function updateOffers(advance = false) {
    const now = Date.now();
    currentOffers = data.offers.filter(o=>o.active && (!o.starts_at || Date.parse(o.starts_at)<=now) && (!o.ends_at || Date.parse(o.ends_at)>now));
    bar.hidden = !currentOffers.length;
    pause.hidden = currentOffers.length < 2;
    if(!currentOffers.length)return;
    if(advance && !paused)offerIndex++;
    offerIndex %= currentOffers.length;
    const offer = currentOffers[offerIndex];
    byId('offer-label').textContent=offer.label;
    byId('offer-text').textContent=offer.text+(offer.code ? ` · Code: ${offer.code}` : '');
    const link=byId('offer-link');
    link.replaceChildren(document.createTextNode(offer.cta+' →'));
    // Allow only internal section links or HTTPS links in owner-authored banners.
    const dest = /^(#[a-zA-Z][\w-]*|https:\/\/)/.test(offer.href) ? offer.href : '/sacred-circuits/';
    link.href = dest.startsWith('#') ? (location.pathname !== '/' ? '/'+dest : dest) : dest;
    if(dest.startsWith('https://')){link.target='_blank';link.rel='noopener noreferrer';}else{link.removeAttribute('target');link.removeAttribute('rel');}
  }
  const updatePause=()=>{pause.textContent=userPaused?'▶':'Ⅱ';pause.setAttribute('aria-label',userPaused?'Play offers':'Pause offers');pause.setAttribute('aria-pressed',String(userPaused));};
  pause.addEventListener('click',()=>{userPaused=!userPaused;paused=userPaused||hovering;updatePause();});
  bar.addEventListener('focusin',()=>{hovering=true;paused=true;});
  bar.addEventListener('focusout',()=>{hovering=false;paused=userPaused;});
  bar.addEventListener('pointerenter',()=>{hovering=true;paused=true;});
  bar.addEventListener('pointerleave',()=>{hovering=false;paused=userPaused;});
  updateOffers();updatePause();
  setInterval(()=>{if(!document.hidden)updateOffers(true);},8000);

  // Hero carousel: showcases every active package and holiday. The featured
  // package leads, matching the order the server rendered for slide zero.
  const heroFeatured = data.packages.find(p=>p.featured) || data.packages[0];
  const heroSlides = [heroFeatured, ...data.packages.filter(p=>p!==heroFeatured), ...data.holidays]
    .map(x=>({...x, type: data.packages.includes(x) ? 'package' : 'holiday'}));
  const heroImage = byId('hero-image');
  if(heroImage){
    const heroEyebrow = byId('hero-eyebrow');
    const heroTitle = byId('hero-title');
    const heroSpec = byId('hero-spec');
    const heroDescription = byId('hero-description');
    const heroCta = byId('hero-cta');
    const heroCtaLabel = byId('hero-cta-label');
    const heroSection = heroImage.closest('.hero');
    const heroDots = [...heroSection.querySelectorAll('.hero-dot')];
    const heroPauseBtn = byId('hero-pause');
    let heroIndex = 0;
    let heroUserPaused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let heroHovering = false;
    let heroPaused = heroUserPaused;
    function renderHero(index) {
      const slide = heroSlides[index];
      heroImage.src = slide.image;
      heroImage.alt = slide.image_alt || '';
      heroEyebrow.textContent = slide.eyebrow;
      heroTitle.textContent = slide.title;
      heroSpec.textContent = slide.duration || '';
      heroDescription.textContent = slide.description;
      if(slide.type === 'package') {
        heroCta.setAttribute('data-package', slide.slug);
        heroCta.onclick = null;
        heroCtaLabel.textContent = 'Request Private Itinerary & Quote';
      } else {
        heroCta.removeAttribute('data-package');
        heroCtaLabel.textContent = 'View this holiday';
        heroCta.onclick = () => location.assign('/holidays/'+slide.slug+'/');
      }
      heroDots.forEach((dot,n) => {
        const active = n === index;
        dot.setAttribute('aria-selected', String(active));
        dot.tabIndex = active ? 0 : -1;
      });
      const activeDot = heroDots[index];
      const left = activeDot.offsetLeft - (activeDot.parentElement.clientWidth - activeDot.offsetWidth) / 2;
      activeDot.parentElement.scrollTo({left,behavior:'auto'});
    }
    function goToHero(index) {
      heroIndex = (index + heroSlides.length) % heroSlides.length;
      renderHero(heroIndex);
    }
    heroDots.forEach(dot => dot.addEventListener('click', () => goToHero(Number(dot.dataset.slide))));
    heroSection.querySelector('.hero-dots').addEventListener('keydown', event => {
      const moves = {ArrowLeft:-1,ArrowRight:1,Home:-heroSlides.length,End:heroSlides.length};
      if(!(event.key in moves))return;
      event.preventDefault();
      goToHero(event.key==='Home'?0:event.key==='End'?heroSlides.length-1:heroIndex+moves[event.key]);
      heroDots[heroIndex].focus();
    });
    heroSection.querySelector('.hero-prev').addEventListener('click', () => goToHero(heroIndex - 1));
    heroSection.querySelector('.hero-next').addEventListener('click', () => goToHero(heroIndex + 1));
    const updateHeroPause = () => {heroPauseBtn.textContent=heroUserPaused?'▶':'Ⅱ';heroPauseBtn.setAttribute('aria-label',heroUserPaused?'Play journeys':'Pause journeys');heroPauseBtn.setAttribute('aria-pressed',String(heroUserPaused));};
    heroPauseBtn.addEventListener('click', () => {heroUserPaused=!heroUserPaused;heroPaused=heroUserPaused||heroHovering;updateHeroPause();});
    heroSection.addEventListener('focusin', () => {heroHovering=true;heroPaused=true;});
    heroSection.addEventListener('focusout', () => {heroHovering=false;heroPaused=heroUserPaused;});
    heroSection.addEventListener('pointerenter', () => {heroHovering=true;heroPaused=true;});
    heroSection.addEventListener('pointerleave', () => {heroHovering=false;heroPaused=heroUserPaused;});
    renderHero(heroIndex);
    updateHeroPause();
    setInterval(() => {if(!document.hidden && !heroPaused)goToHero(heroIndex + 1);}, 7000);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-carousel][data-dir]');
    if(!button)return;
    const track = document.querySelector(`[data-carousel-track="${button.dataset.carousel}"]`);
    if(!track)return;
    const card = track.querySelector(':scope > *');
    const step = card ? card.getBoundingClientRect().width + 18 : track.clientWidth * 0.8;
    track.scrollBy({left: Number(button.dataset.dir) * step, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  });

  const carouselTracks = document.querySelectorAll('[data-carousel-track]');
  const syncCarouselNav = track => {
    const max = track.scrollWidth - track.clientWidth;
    document.querySelectorAll(`[data-carousel="${track.dataset.carouselTrack}"]`).forEach(button => {
      button.disabled = Number(button.dataset.dir) < 0 ? track.scrollLeft <= 1 : track.scrollLeft >= max - 1;
    });
  };
  carouselTracks.forEach(track => {
    syncCarouselNav(track);
    track.addEventListener('scroll', () => syncCarouselNav(track), {passive: true});
  });
  window.addEventListener('resize', () => carouselTracks.forEach(syncCarouselNav));
})();
