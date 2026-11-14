# Irisha Concierge

A static concierge travel website with a Decap CMS content model and Cloudflare Pages deployment support. Public pages use semantic HTML, custom CSS and dependency-free JavaScript. Sacred Triangle, Bihar Circuit, Varanasi Pilgrimage Concierge, Force Urbania, and Innova Crysta/Hycross have dedicated indexable pages. International holiday pages remain available but are temporarily noindex pending editorial itinerary and content review. Google reCAPTCHA v2 checkbox verification protects CRM inquiry saves, not the public WhatsApp destination.

## Current delivery

The Sites URL is a private review deployment of the complete static website. The editor is configured for the private GitHub repository `shubhamkoolguy/irisha-website`, branch `main`. This does **not** replace the website at `irisha.co.in` or activate its CMS login. Cloudflare Pages, the production domain, and the GitHub OAuth app still require account setup.

The supplied website includes contextual inquiry dialogs that save to CRM before showing a reference and opening WhatsApp, server-verified reCAPTCHA, mandatory edge rate limiting, public email links, Google review excerpts, native keyboard-accessible detail dialogs, mobile navigation, timed offer rotation with a pause control, no-JavaScript readable core content, metadata, a sitemap, a 404 page and optimized WebP photos. Failed saves offer a click-only direct WhatsApp fallback without a confirmed receipt.

## Run and build

Requires Node.js 22 or newer. There are no project packages to install.

```sh
npm run build
npm run check
```

`npm run build` reads JSON in `content/`, copies `public/` and `assets/`, writes the static website into `dist/`, and creates a self-contained Sites Worker in `dist/server/index.js`. `npm run build:pages` produces just the Cloudflare Pages static output; its Pages Functions supply the verification endpoints. `dist/` is generated and gitignored — run `npm run build` before serving or deploying.

For a local static review, serve `dist/` with a static web server. Direct `file://` opening will not support root-relative assets or CMS requests.

## Content structure

| File or folder | Owner edits |
| --- | --- |
| `content/settings.json` | Brand, Hindi tagline, homepage copy, hero image, domain |
| `content/offers/*.json` | Active offers, coupon codes, order, destination links, optional start/end times |
| `content/packages/*.json` | Circuits, price, itinerary, imagery, inclusions and availability notes |
| `content/fleet/*.json` | Vehicles, seats, images, features, prices and details |
| `content/services.json` | Holiday, visa, hotel, flight and event service cards and their dedicated pages |
| `admin/config.yml` | Decap collection schemas and GitHub connection |
| `assets/uploads/` | Owner-uploaded photos |

Keep one active featured package and one active featured vehicle. Additional active circuits and vehicles appear as secondary cards. Ordering is controlled by `order` (lowest first). Changes to content take effect after the Git-connected Cloudflare Pages build finishes.

A starting price of **0 means quote only** and never renders as a free offer. Approved positive prices are formatted in INR. Rate units and accompanying conditions are editable. No fabricated discounts, testimonials, ratings or booking counts are included.

Offer dates use ISO 8601 with an explicit time zone, e.g. `2026-11-01T00:00:00+05:30`. Set `active` to false to remove an offer. Expired offers are also hidden by the browser, without waiting for a rebuild. There is one evergreen introductory announcement until the owner supplies an approved seasonal offer. Add multiple active entries for rotation; reduced-motion preferences pause automatic rotation. Offers use internal anchors or full HTTPS links.

## Cloudflare Pages: one-time connection

1. Use the business repository [shubhamkoolguy/irisha-website](https://github.com/shubhamkoolguy/irisha-website), branch `main`. GitHub editors need write access to that repository.
2. `admin/config.yml` is configured with `repo: shubhamkoolguy/irisha-website` and `branch: main`. Its `base_url` and `site_url` are `https://irisha.co.in`, the configured production domain.
3. In Cloudflare **Workers & Pages → Create → Pages → Import an existing Git repository**, select the repository. Use **no framework preset**, build command **`npm run build:pages`**, output **`dist`**, Node.js **22**, and production branch **`main`**.
4. Add `irisha.co.in` through that Pages project's Custom domains flow and apply the DNS records Cloudflare provides. No domain/DNS changes have been made by this delivery.
5. In Cloudflare, redirect `www.irisha.co.in` permanently to `https://irisha.co.in` and confirm both hosts serve the same canonical site before launch. The static build emits apex canonical URLs; domain-level redirect cannot be configured from this repository.
6. Create a GitHub OAuth App with homepage `https://irisha.co.in` and callback `https://irisha.co.in/api/callback`. Keep the default non-expiring OAuth-token mode; the bundled Decap integration does not implement refresh-token rotation.
7. Set these Cloudflare Pages production variables/secrets, then redeploy:

| Name | Value |
| --- | --- |
| `SITE_URL` | `https://irisha.co.in` — exact canonical origin |
| `GITHUB_REPO` | `shubhamkoolguy/irisha-website` |
| `GITHUB_CLIENT_ID` | The OAuth application's client ID |
| `GITHUB_CLIENT_SECRET` | The OAuth application secret, stored as a **secret** |

8. Open `https://irisha.co.in/admin/`, sign in with a GitHub editor account, change one draft offer to inactive or make a small text edit, save, and confirm the automatic Pages rebuild publishes it. End-to-end GitHub login requires your accounts and has not been performed in the private Sites deployment.

Pages Functions in `functions/api/` handle GitHub OAuth and contact verification. Public content is served statically. `public/_routes.json` limits invocation to `/api/auth`, `/api/callback`, `/api/captcha-config`, `/api/contact`, `/admin/` and `/admin/index.html`. The admin HTML middleware sets a single editor-specific Content Security Policy, allowing the runtime evaluation needed by Decap configuration validation. Public pages retain their stricter policy without `unsafe-eval`. The Sites deployment uses the same contact verification code inside a dependency-free Worker that embeds public assets. Functions use standard Web APIs, require an exact configured origin, validate an HttpOnly Secure SameSite state cookie and PKCE verifier, check repository write permissions, restrict popup messages to the configured origin, and return no-store responses. Secrets never appear in the public configuration. Do not upload `.env` files to `dist/`.

If you use the `*.pages.dev` origin initially, align `content/settings.json`, the CMS `base_url`/`site_url`, `SITE_URL`, and the OAuth callback to that exact origin. Configure your final domain and change them together before launch. CMS login from unrelated preview domains is deliberately rejected.

### Google reCAPTCHA activation

Frontend and server verification protect inquiry saves. Missing/invalid configuration disables saving; no test-key, disabled-JavaScript or failed-provider bypass. Owner-approved phone, email and WhatsApp number are public; CAPTCHA is not phone-number secrecy.

Create a **reCAPTCHA v2 “I'm not a robot” Checkbox** integration in [Google's reCAPTCHA console](https://www.google.com/recaptcha/admin/create). This implementation uses the v2 `api.js` and `siteverify` API, so supply a compatible site key and secret, not v3 keys or Enterprise assessment-only credentials. Register the exact serving hostnames, without a scheme or path:

- `irisha-concierge.shubhamkoolguy.chatgpt.site` for the private Sites deployment.
- `irisha.co.in` and `www.irisha.co.in` for the business domain once connected.

Set these values in the host's **runtime environment settings**, then republish/redeploy:

| Name | Setting |
| --- | --- |
| `RECAPTCHA_SITE_KEY` | Public site key from the matching Google v2 checkbox integration |
| `RECAPTCHA_SECRET_KEY` | Matching secret, stored as a **secret** |
| `RECAPTCHA_ALLOWED_HOSTNAMES` | Comma-separated exact hostnames listed above |
| `CONTACT_WHATSAPP` | Confirmed business number, international digits only, stored as a **secret** |

Legacy `/api/contact` verification still uses runtime `CONTACT_WHATSAPP`; inquiry saves reuse that verification configuration. The new post-receipt WhatsApp link uses the existing public `wa.me/919966320256`. Confirm this number with the owner before launch. Previously published copies cannot be recalled.

Planning buttons open the inquiry form. Submission verifies a fresh Google token and saves details through `/api/inquiries` to CRM. The challenge is outside native dialogs. Confirmed receipt shows a reference and Continue on WhatsApp link, then automatically opens WhatsApp using the existing public wa.me number. The encoded message includes name, phone, selected service, travelers, date, pickup, notes and confirmed reference. Nothing is sent until the visitor presses Send in WhatsApp. Failed saves or unavailable verification offer an explicitly labeled, click-only direct WhatsApp fallback with full details but no receipt or reference. Receipt remains unconfirmed; CRM protection is never bypassed. Failed requests preserve form details and retry key in memory. Email remains direct; call links are removed.

The Sites Worker permits public pages to be embedded by `https://chatgpt.com`. CMS pages retain same-origin-only embedding. Cloudflare Pages uses its own same-origin policy in `public/_headers`. Missing protection settings disable inquiry submission, not public pages.

### CRM inquiry activation

Set runtime secret `WEBSITE_INQUIRY_SECRET` matching CRM. Optional `CRM_INQUIRY_URL` defaults to `https://wanderdesk-crm.pages.dev/api/integrations/website/inquiries`. Configure real CAPTCHA settings above; CAPTCHA remains mandatory. Secrets remain server-only; no build-time credential injection.

Edge protection has two alternatives: native Worker binding `INQUIRY_RATE_LIMITER` with `.limit({key})`, or a Cloudflare zone WAF rate limiting rule for Pages on its custom domain. For Pages, configure and test a rule matching that hostname, method POST and exact path `/api/inquiries`, then set runtime `INQUIRY_EDGE_RATE_LIMITED` to the exact string `'true'`. **This flag confirms operator setup; it is not protection itself.** Do not enable it before testing the external rule. Keep previews and unprotected `pages.dev` hosts disabled: omit the preview flag, restrict CAPTCHA allowed hostnames to protected hosts, and redirect or block alternate production hosts. Neither binding nor explicit confirmation means 503. A present binding always takes priority and cannot be bypassed by the flag on errors or denial. Neither alternative promises globally exact quotas.

See [implemented technical contract and operator steps](docs/website-crm-inquiry-technical-spec.md) for Wrangler binding example, Pages/Worker routing, validation, retry semantics and release checks. `/api/inquiries` is included in Pages invocation routes. `npm run check` includes focused inquiry tests. No live setup or deployment is performed by these tests.

This reduces automated harvesting from this site. It is **not** a guarantee against scrapers, CAPTCHA-solving services, robocalls or numbers obtained from older pages, social media or directories. Public marketing pages remain readable. Additional site-wide anti-scraping controls would require configuration in the business's Cloudflare account; none have been enabled by this change. The visible checkbox remains until a low-friction provider is configured and tested with production credentials; do not remove server-side verification or replace it with client-only checks.

Google docs: https://developers.google.com/recaptcha/docs/display and https://developers.google.com/recaptcha/docs/verify

### Brand and images

No logo file was provided; the header uses a custom typographic wordmark and simple monogram. Replace with the supplied brand asset when available. Image source and reuse details are in `ASSET_SOURCES.md`.

The Force Urbania photo is an official manufacturer model-reference image, not a photograph of the business's allocated vehicle. Replace it with owned/licensed fleet photography before public commercial launch if reuse permission is not available. Seating and upgraded interior details are confirmed before booking; this website does not claim the reference photograph proves a specific interior configuration.

### Checks performed

Static content and local-asset checks, anchor validation, JavaScript syntax checks, public contact-leak checks, OAuth rejection/permission/popup tests, and reCAPTCHA missing/test-key, invalid-token, replay, hostname, origin, honeypot, oversized-request and provider-outage tests. Provider verification is mocked in automated tests; a live Google challenge needs the owner’s real keys. Desktop/mobile live-browser QA and real-account Google/OAuth verification remain release checks for the connected deployment.

## Editing and maintenance

- Run `npm run build` after changing content or admin sources; run `npm run check` before committing.
- `public/app.js` owns navigation, native dialogs, offer rotation, inquiry retries, post-receipt WhatsApp links and reCAPTCHA UI. `server/contact-worker.mjs` supplies protected CRM proxy, verification and Sites asset serving. CRM and CAPTCHA secrets are runtime-only.
- `public/styles.css` defines the responsive layouts. Obsidian `#0b0614`, dark violet surfaces and orchid/magenta accents are central CSS variables.
- Google Fonts serves Plus Jakarta Sans, Cormorant Garamond and Noto Sans Devanagari, each with system fallbacks. Fonts use `display=swap`.
- Decap CMS is pinned to `3.16.3` and loads only on the admin route, after the real repository is configured. Update deliberately after checking upstream release notes.
- Keep `public/_headers`, `_redirects` and `_routes.json` in source; the build copies them into `dist/`. The custom 404 avoids accidental fallback to the homepage for unknown paths.

## Official setup references

- https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://decapcms.org/docs/install-decap-cms/
- https://decapcms.org/docs/github-backend/
- https://decapcms.org/docs/backends-overview/
- https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
