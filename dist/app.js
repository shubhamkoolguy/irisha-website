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
  const today = new Date();
  byId('travel-date').min = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  function inquire(interest, trigger) {
    if(detail.open) detail.close();
    const select = byId('interest');
    if([...select.options].some(option => option.value === interest))select.value = interest;
    openDialog(inquiry, trigger);
  }
  const action = label => `<button class="button detail-cta" data-inquire="${e(label)}">Personalise my ${data.fleet.some(x=>x.title===label)?'ride':'journey'} <span aria-hidden="true">→</span></button>`;
  const packageItinerary = p => `<ol class="itinerary">${p.itinerary.map((day,i)=>`<li class="itinerary-stop"><span class="stop-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><div><p class="small-eyebrow">Day ${i+1} · ${e(day.place)}</p><h3>${e(day.title)}</h3><p>${e(day.description)}</p>${day.schedule?.length?`<dl class="itinerary-schedule">${day.schedule.map(slot=>`<div><dt>${e(slot.period)}</dt><dd>${e(slot.description)}</dd></div>`).join('')}</dl>`:''}${day.overnight?`<p class="itinerary-overnight"><strong>Overnight</strong> ${e(day.overnight)}</p>`:''}</div></li>`).join('')}</ol>`;
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
    byId('detail-content').innerHTML = html;
    openDialog(detail, trigger);
  }
  document.addEventListener('click',event => {
    const button = event.target.closest('[data-contact],[data-inquire],[data-package],[data-vehicle],[data-policy]');
    if(!button)return;
    if(button.hasAttribute('data-contact')){startVerification('Namaste Irisha Concierge, I would like to plan a private journey. Please help me with the next steps.',button);return;}
    if(button.hasAttribute('data-inquire'))inquire(button.dataset.inquire, button.closest('dialog') ? returnFocus : button);
    else for(const type of ['package','vehicle','policy'])if(button.hasAttribute('data-'+type)){showDetail(type,button.dataset[type],button);break;}
  });
  byId('inquiry-form').addEventListener('submit',event => {
    event.preventDefault();
    const form = event.currentTarget;
    if(!form.reportValidity())return;
    const values = new FormData(form);
    const message = [
      `Namaste Irisha Concierge, I’m ${values.get('name').trim()}.`,
      `I’m interested in: ${values.get('interest')}.`,
      `Travelling with: ${values.get('guests')}.`,
      values.get('date') ? `Preferred date: ${values.get('date')}.` : 'Travel dates: Flexible / to be discussed.',
      values.get('notes').trim() ? `My wishes: ${values.get('notes').trim()}` : '',
      'Please help me plan and share a personalised quote.'
    ].filter(Boolean).join('\n');
    byId('contact-company').value = String(values.get('company_website') || '');
    startVerification(message,returnFocus);
  });

  // Render the Google challenge outside native dialogs so its challenge iframe
  // remains keyboard-accessible and is not made inert by showModal().
  const verificationPanel = byId('contact-verification');
  const status = byId('captcha-status');
  const verifyButton = byId('verified-contact');
  const retryButton = byId('captcha-retry');
  let pendingMessage = '';
  let verificationTrigger;
  let captchaToken = '';
  let widgetId;
  let apiPromise;
  let loading = false;
  let sending = false;
  function clearToken() {captchaToken='';verifyButton.disabled=true;}
  function resetWidget() {clearToken();if(widgetId!==undefined && window.grecaptcha)window.grecaptcha.reset(widgetId);}
  function loadGoogle() {
    if(window.grecaptcha?.render)return Promise.resolve();
    if(apiPromise)return apiPromise;
    apiPromise = new Promise((resolve,reject) => {
      const script=document.createElement('script');
      const timeout=setTimeout(()=>{script.remove();reject(Error('Verification could not load. Please check your connection and try again.'));},15000);
      window.irishaCaptchaReady=()=>{clearTimeout(timeout);resolve();};
      script.src='https://www.google.com/recaptcha/api.js?onload=irishaCaptchaReady&render=explicit';
      script.async=true;script.defer=true;
      script.onerror=()=>{clearTimeout(timeout);script.remove();reject(Error('Verification could not load. Please check your connection and try again.'));};
      document.head.append(script);
    }).catch(error=>{apiPromise=undefined;throw error;});
    return apiPromise;
  }
  async function loadCaptcha() {
    if(loading)return;
    loading=true;clearToken();retryButton.hidden=true;
    status.textContent='Loading secure verification…';
    try {
      const response=await fetch('/api/captcha-config',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw Error('Contact verification is temporarily unavailable. Please try again later.');
      const config=await response.json();
      if(!config.configured || !config.siteKey)throw Error('Contact verification is temporarily unavailable. Please try again later.');
      await loadGoogle();
      if(widgetId===undefined){
        // Google's horizontal layout fits the concierge card on most screens.
        // Use its compact layout only when the available space is narrower.
        const widgetSize=byId('captcha-widget').clientWidth>=304?'normal':'compact';
        byId('captcha-widget').dataset.layout=widgetSize;
        widgetId=window.grecaptcha.render('captcha-widget',{
          sitekey:config.siteKey,theme:document.documentElement.dataset.theme || 'dark',size:widgetSize,
          callback:token=>{captchaToken=token;verifyButton.disabled=false;status.textContent='Check complete. You can continue to WhatsApp.';},
          'expired-callback':()=>{clearToken();status.textContent='Your verification expired. Please check the box again.';},
          'error-callback':()=>{clearToken();status.textContent='Verification could not complete. Please try again.';retryButton.hidden=false;}
        });
      }else resetWidget();
      status.textContent='Complete the checkbox to continue.';
    }catch(error){clearToken();status.textContent=error.name==='TimeoutError'?'Verification took too long. Please try again.':error.message;retryButton.hidden=false;}
    finally{loading=false;}
  }
  function startVerification(message,trigger) {
    if(sending)return;
    pendingMessage=message;
    verificationTrigger=trigger;
    closeMenu();
    if(inquiry.open)inquiry.close();
    if(detail.open)detail.close();
    verificationPanel.hidden=false;
    requestAnimationFrame(()=>{verificationPanel.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});byId('verification-title').focus({preventScroll:true});});
    loadCaptcha();
  }
  retryButton.addEventListener('click',loadCaptcha);
  byId('verification-cancel').addEventListener('click',()=>{
    if(sending)return;
    resetWidget();pendingMessage='';verificationPanel.hidden=true;
    verificationTrigger?.focus({preventScroll:false});
  });
  verifyButton.addEventListener('click',async()=>{
    if(sending || !captchaToken || !pendingMessage)return;
    sending=true;verifyButton.disabled=true;verifyButton.setAttribute('aria-busy','true');
    status.textContent='Checking securely…';
    try {
      const response=await fetch('/api/contact',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({token:captchaToken,company_website:byId('contact-company').value}),
        signal:AbortSignal.timeout(15000)
      });
      const result=await response.json();
      if(!response.ok)throw Error(result.error || 'Verification failed. Please try again.');
      if(typeof result.whatsappUrl!=='string' || !/^https:\/\/wa\.me\/[1-9][0-9]{7,14}$/.test(result.whatsappUrl))throw Error('The contact link could not be opened. Please try again.');
      clearToken();
      status.textContent='Verified. Opening WhatsApp…';
      // Same-tab navigation avoids popup blockers after an asynchronous verification.
      window.location.assign(result.whatsappUrl+'?text='+encodeURIComponent(pendingMessage));
    }catch(error){resetWidget();status.textContent=error.name==='TimeoutError'?'Verification took too long. Please try again.':error.message;retryButton.hidden=false;}
    finally{sending=false;verifyButton.removeAttribute('aria-busy');}
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
    const dest = /^(#[a-zA-Z][\w-]*|https:\/\/)/.test(offer.href) ? offer.href : '#sacred-circuits';
    link.href = dest.startsWith('#') && location.pathname !== '/' ? '/'+dest : dest;
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
