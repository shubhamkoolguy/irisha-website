# Irisha Concierge

A complete static luxury travel website with a Decap CMS content model and Cloudflare Pages deployment support. Public pages use semantic HTML, custom CSS and dependency-free JavaScript. No client framework, database or analytics tracker is required. Google reCAPTCHA v2 checkbox verification protects access to the WhatsApp destination; Google keys and its current service terms/quotas apply.

## Current delivery

The Sites URL is a private review deployment of the complete static website. The editor is configured for the private GitHub repository `shubhamkoolguy/irisha-website`, branch `main`. This does **not** replace the website at `irisha.co.in` or activate its CMS login. Cloudflare Pages, the production domain, and the GitHub OAuth app still require account setup.

The supplied website includes contextual inquiry dialogs that compose WhatsApp messages and server-verified reCAPTCHA contact access, native keyboard-accessible detail dialogs, mobile navigation, timed offer rotation with a pause control, no-JavaScript readable core content, a custom favicon, metadata, a sitemap, a 404 page and optimized WebP photos.

## Run and build

Requires Node.js 22 or newer. There are no project packages to install.

```sh
npm run build
npm run check
```

`npm run build` reads JSON in `content/`, writes the static website and creates a self-contained Sites Worker in `dist/server/index.js`. `npm run build:pages` produces just the Cloudflare Pages static output; its Pages Functions supply the verification endpoints. CSS, JavaScript and media are tracked directly in `dist/`; **do not delete `dist/` as a clean step**. The repository is intentionally deployable without a framework build tool.

For a local static review, serve `dist/` with a static web server. Direct `file://` opening will not support root-relative assets or CMS requests.

## Content structure

| File or folder | Owner edits |
| --- | --- |
| `content/settings.json` | Brand, Hindi tagline, homepage copy, hero image, domain |
| `content/offers/*.json` | Active offers, coupon codes, order, destination links, optional start/end times |
| `content/packages/*.json` | Circuits, price, itinerary, imagery, inclusions and availability notes |
| `content/fleet/*.json` | Vehicles, seats, images, features, prices and details |
| `content/services.json` | Holiday, visa, hotel, flight and event service cards |
| `admin/config.yml` | Decap collection schemas and GitHub connection |
| `dist/assets/uploads/` | Owner-uploaded photos |

Keep one active featured package and one active featured vehicle. Additional active circuits and vehicles appear as secondary cards. Ordering is controlled by `order` (lowest first). Changes to content take effect after the Git-connected Cloudflare Pages build finishes.

A starting price of **0 means quote only** and never renders as a free offer. Approved positive prices are formatted in INR. Rate units and accompanying conditions are editable. No fabricated discounts, testimonials, ratings or booking counts are included.

Offer dates use ISO 8601 with an explicit time zone, e.g. `2026-11-01T00:00:00+05:30`. Set `active` to false to remove an offer. Expired offers are also hidden by the browser, without waiting for a rebuild. There is one evergreen introductory announcement until the owner supplies an approved seasonal offer. Add multiple active entries for rotation; reduced-motion preferences pause automatic rotation. Offers use internal anchors or full HTTPS links.

## Cloudflare Pages: one-time connection

1. Use the business repository [shubhamkoolguy/irisha-website](https://github.com/shubhamkoolguy/irisha-website), branch `main`. GitHub editors need write access to that repository.
2. `admin/config.yml` is configured with `repo: shubhamkoolguy/irisha-website` and `branch: main`. Its `base_url` and `site_url` are `https://irisha.co.in`, the configured production domain.
3. In Cloudflare **Workers & Pages → Create → Pages → Import an existing Git repository**, select the repository. Use **no framework preset**, build command **`npm run build:pages`**, output **`dist`**, Node.js **22**, and production branch **`main`**.
4. Add `irisha.co.in` through that Pages project's Custom domains flow and apply the DNS records Cloudflare provides. No domain/DNS changes have been made by this delivery.
5. Create a GitHub OAuth App with homepage `https://irisha.co.in` and callback `https://irisha.co.in/api/callback`. Keep the default non-expiring OAuth-token mode; the bundled Decap integration does not implement refresh-token rotation.
6. Set these Cloudflare Pages production variables/secrets, then redeploy:

| Name | Value |
| --- | --- |
| `SITE_URL` | `https://irisha.co.in` — exact canonical origin |
| `GITHUB_REPO` | `shubhamkoolguy/irisha-website` |
| `GITHUB_CLIENT_ID` | The OAuth application's client ID |
| `GITHUB_CLIENT_SECRET` | The OAuth application secret, stored as a **secret** |

7. Open `https://irisha.co.in/admin/`, sign in with a GitHub editor account, change one draft offer to inactive or make a small text edit, save, and confirm the automatic Pages rebuild publishes it. End-to-end GitHub login requires your accounts and has not been performed in the private Sites deployment.

Pages Functions in `functions/api/` handle GitHub OAuth and contact verification. Public content is served statically. `dist/_routes.json` limits invocation to `/api/auth`, `/api/callback`, `/api/captcha-config`, `/api/contact`, `/admin/` and `/admin/index.html`. The admin HTML middleware sets a single editor-specific Content Security Policy, allowing the runtime evaluation needed by Decap configuration validation. Public pages retain their stricter policy without `unsafe-eval`. The Sites deployment uses the same contact verification code inside a dependency-free Worker that embeds public assets. Functions use standard Web APIs, require an exact configured origin, validate an HttpOnly Secure SameSite state cookie and PKCE verifier, check repository write permissions, restrict popup messages to the configured origin, and return no-store responses. Secrets never appear in the public configuration. Do not upload `.env` files to `dist/`.

If you use the `*.pages.dev` origin initially, align `content/settings.json`, the CMS `base_url`/`site_url`, `SITE_URL`, and the OAuth callback to that exact origin. Configure your final domain and change them together before launch. CMS login from unrelated preview domains is deliberately rejected.

### Google reCAPTCHA activation

The frontend and server verification are implemented. **Contact links stay locked until real Google keys are configured.** There is no test-key, disabled-JavaScript or failed-provider bypass. A missing/invalid configuration returns a generic unavailable message without revealing the phone number.

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

The current business contact was moved from the page/CMS data into `CONTACT_WHATSAPP`. It still needs owner confirmation. Do not put it in public JSON, page copy, offers, image filenames, HTML, JS, schema metadata or a public repository. Previously published copies cannot be recalled by this change.

All WhatsApp buttons open the protected flow. Direct contact buttons request verification immediately; trip-planning forms prepare the message locally and then open verification. Google's challenge is rendered outside native dialogs so its iframe remains accessible. The contact endpoint checks the request origin, request size, honeypot and Google response, rejects wrong hostnames and failures, and releases the WhatsApp destination only on success. Google enforces token expiry and single use. Responses are not cached; contact details and keys are not logged. Travel names, dates and notes stay on the device until the visitor chooses to send them in WhatsApp.

The Sites Worker permits public pages to be embedded by `https://chatgpt.com` so the in-app Site view can load. CMS pages retain same-origin-only embedding. Cloudflare Pages uses its own same-origin policy in `dist/_headers`. Missing reCAPTCHA keys disable contact verification, not the public page. There is currently no inquiry database or Google Sheets integration: a request reaches the business only when the visitor sends the prepared WhatsApp message.

This reduces automated harvesting from this site. It is **not** a guarantee against scrapers, CAPTCHA-solving services, robocalls or numbers obtained from older pages, social media or directories. Public marketing pages remain readable. Additional site-wide anti-scraping controls would require configuration in the business's Cloudflare account; none have been enabled by this change.

Google docs: https://developers.google.com/recaptcha/docs/display and https://developers.google.com/recaptcha/docs/verify

### Brand and images

No logo file was provided; the header uses a custom typographic wordmark and simple monogram. Replace with the supplied brand asset when available. Image source and reuse details are in `ASSET_SOURCES.md`.

The Force Urbania photo is an official manufacturer model-reference image, not a photograph of the business's allocated vehicle. Replace it with owned/licensed fleet photography before public commercial launch if reuse permission is not available. Seating and upgraded interior details are confirmed before booking; this website does not claim the reference photograph proves a specific interior configuration.

### Checks performed

Static content and local-asset checks, anchor validation, JavaScript syntax checks, public contact-leak checks, OAuth rejection/permission/popup tests, and reCAPTCHA missing/test-key, invalid-token, replay, hostname, origin, honeypot, oversized-request and provider-outage tests. Provider verification is mocked in automated tests; a live Google challenge needs the owner’s real keys. Desktop/mobile live-browser QA and real-account Google/OAuth verification remain release checks for the connected deployment.

## Editing and maintenance

- Run `npm run build` after changing content or admin sources; run `npm run check` before committing.
- `dist/app.js` owns navigation, native dialogs, offer rotation, WhatsApp message composition and the reCAPTCHA UI. `server/contact-worker.mjs` supplies server verification and Sites asset serving. The secret and phone number are read only from runtime variables.
- `dist/styles.css` defines the responsive layouts. Obsidian `#0b0614`, dark violet surfaces and orchid/magenta accents are central CSS variables.
- Google Fonts serves Plus Jakarta Sans, Cormorant Garamond and Noto Sans Devanagari, each with system fallbacks. Fonts use `display=swap`.
- Decap CMS is pinned to `3.16.3` and loads only on the admin route, after the real repository is configured. Update deliberately after checking upstream release notes.
- Keep `dist/_headers`, `_redirects` and `_routes.json` in the published output. The custom 404 avoids accidental fallback to the homepage for unknown paths.

## Official setup references

- https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://decapcms.org/docs/install-decap-cms/
- https://decapcms.org/docs/github-backend/
- https://decapcms.org/docs/backends-overview/
- https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
