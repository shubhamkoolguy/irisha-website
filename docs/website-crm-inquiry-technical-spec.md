# Website CRM inquiry implementation

## Contract

The browser posts to same-origin `/api/inquiries`. Pages Functions and the asset-embedded Worker share `server/contact-worker.mjs`. Keep this module self-contained: the Worker builder embeds one source file without bundling imports.

The server forwards exactly `{submission_key,name,phone,service_id,travel_date,travelers,pickup,notes,attribution}`. `submission_key` is a browser-generated UUID. `travel_date` is ISO `YYYY-MM-DD` or null. `travelers` is an integer from 1 to 100 or null. Pickup and notes are strings. Authentication is `Authorization: Bearer WEBSITE_INQUIRY_SECRET`, server-only.

CRM `app/shared/inquiries.ts` accepts service IDs matching `^[\w-]{1,100}$`; it has no service enum. Website options use explicit content slugs for circuits, vehicles, services and holidays. Dates entered as DD/MM/YYYY become ISO before submission. CRM normalizes phone digits; the form asks for country code.

Attribution permits only `gclid`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, and `landing_page_url`. Values are strings up to 500 characters. Landing URL excludes query and fragment. No consent claims, inquiry PII, keys or attribution are persisted in cross-session browser storage. Campaign values come from the current URL; operators must not put personal information in campaign parameters.

## Protection

POST only, JSON only, exact Origin and same-origin Fetch Metadata when present. Streamed request bodies are capped at 16 KiB, including CAPTCHA token and honeypot. Invalid JSON, unknown fields, invalid dates, numbers and attribution are rejected before CRM access. Honeypot must be empty.

Every attempt requires a fresh Google reCAPTCHA v2 checkbox token verified server-side with exact hostname, plus configured edge rate protection. A present Cloudflare `INQUIRY_RATE_LIMITER.limit({key})` binding takes priority; its key is Cloudflare's trusted `CF-Connecting-IP`. Malformed binding, missing IP, binding errors or denial never fall back to the WAF confirmation flag. Without a binding, only runtime `INQUIRY_EDGE_RATE_LIMITED` equal to the exact string `'true'` permits the externally protected path. Missing both protection options or missing secrets fails closed. The flag is an operator assertion, not rate limiting or proof of WAF configuration. There is no queue, Durable Object, custom HMAC, client-only bypass or contact endpoint bypass for saving. Redirects from CRM are rejected to prevent credential forwarding.

## Receipt and retries

CRM 201 means new receipt; 200 means idempotent retry. Only validated `{inquiry_reference: UUID,status:'received'}` is exposed. Conflict maps to 409; upstream failures to 502; protection configuration failures to 503; rate denial to 429. CRM error bodies and credentials are never returned or logged. Upstream requests time out after 10 seconds; browser after 15 seconds. An ambiguous save displays `Could not confirm receipt. Please retry.`

Unchanged payload retries keep the same UUID in memory. Changed payload receives a new UUID. CAPTCHA token is renewed independently. Refreshing the page loses this retry state; operators should check CRM before requesting another submission after a lost receipt. Save succeeds before a reference and explicit Continue on WhatsApp link appear. WhatsApp never opens or sends automatically. `inquiry_received` emits only after receipt, without PII. External GTM container rules must also be audited for premature conversion triggers.

## Operator setup

1. Set `WEBSITE_INQUIRY_SECRET` as a runtime secret matching CRM. Never place it in content, public files, build variables or client code.
2. Optionally set `CRM_INQUIRY_URL`; default is `https://wanderdesk-crm.pages.dev/api/integrations/website/inquiries`. Overrides must use HTTPS and trusted CRM hosts.
3. Configure real `RECAPTCHA_SITE_KEY`, secret `RECAPTCHA_SECRET_KEY`, exact comma-separated `RECAPTCHA_ALLOWED_HOSTNAMES`, and `CONTACT_WHATSAPP` (international digits). Test keys are rejected. Existing contact verification config is reused, including its WhatsApp config requirement.
4. Choose one edge protection option. For Workers with native binding support, configure `INQUIRY_RATE_LIMITER`. Example Worker Wrangler configuration:

```json
{
  "ratelimits": [{
    "name": "INQUIRY_RATE_LIMITER",
    "namespace_id": "1001",
    "simple": {"limit": 5, "period": 60}
  }]
}
```

Use a namespace unique to this application. Native limits are per-location, not a global exact quota. Configure production and preview independently.

Cloudflare Pages does not support this native binding. For Pages, configure a **zone WAF rate limiting rule externally** on the serving custom domain. Match the exact hostname, method POST and exact path `/api/inquiries`. Example expression:

```text
(http.host eq "irisha.co.in" and http.request.method eq "POST" and http.request.uri.path eq "/api/inquiries")
```

Choose an IP-based threshold and time window supported by the account plan (for example, five requests per minute if available), with a blocking action. Confirm the rule is enabled and requests pass through that zone. Test below-threshold requests and a burst that the WAF blocks before Functions/CRM. After that test, set production runtime `INQUIRY_EDGE_RATE_LIMITED='true'`. The flag alone provides no protection; application code cannot inspect whether the rule exists. WAF enforcement also does not promise a globally exact quota.

Keep unprotected previews disabled: omit the flag in preview runtime config and do not attach a native binding there unless intended and tested. Limit `RECAPTCHA_ALLOWED_HOSTNAMES` to protected production custom domains; Google key registration should match. The production `pages.dev` alias may share production runtime variables, so exclude it from CAPTCHA hostnames and redirect or block it rather than treating the flag as hostname-scoped protection. Any additional allowed hostname needs its own tested WAF rule. Never copy the confirmation flag into an unprotected deployment. Without a binding or explicit WAF confirmation, submission returns 503. Do not substitute an in-memory limiter.

5. Run `npm run build` and `npm run check`. Pages uses `npm run build:pages`, Functions source, and `/api/inquiries` in `_routes.json`. Do not deploy `dist/server` as a Pages static endpoint.
6. Before launch, test real CAPTCHA, rate denial, missing config, CRM receipt/retry/conflict, and desktop/mobile flow on the serving hostname. Verify credentials never appear in public assets or responses. No live credentials, account configuration or deployment were performed by this implementation.

## Privacy

Visible disclosure: By submitting, you request Irisha to save your inquiry and contact you about your trip. No privacy or marketing checkboxes. CRM stores inquiry details for trip follow-up. Privacy copy describes CRM, Cloudflare, CAPTCHA, WhatsApp and existing Google tags. Retention/access/deletion policy remains an operator responsibility; no unsupported retention promise is made.
