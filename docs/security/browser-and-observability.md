# Browser security and privacy-safe observability

The application enforces a same-origin browser boundary with CSP, frame denial,
strict referrer handling, restricted browser capabilities, content sniffing
protection, and production-only HSTS. Cloudinary and Google Cloud Storage are
added to image/media/connect directives only when their corresponding public
configuration exists. Next.js currently requires inline bootstrap scripts and
the custom UI uses bounded inline style values, so `unsafe-inline` remains an
explicit accepted CSP risk; arbitrary remote script/style origins remain
blocked.

Cookie-authenticated unsafe API methods require an allowed Origin and
same-origin Fetch Metadata. Explicit Bearer clients are not susceptible to
ambient-cookie CSRF and retain API compatibility. Public contact and auth flows
apply their own stricter body, origin, timing, idempotency, and rate controls.

Correlation IDs are bounded safe tokens. Server failure logs contain only the
correlation ID, method, pathname without query data, status, and error class.
They never contain request bodies, form fields, tokens, cookies, provider
credentials, or stack traces in production. CSP reports retain only origins and
directive tokens. A deployment may forward these structured events to an
approved provider later; no external telemetry provider is required for core
operation.

Web Vitals reporting is disabled by default. When explicitly enabled, the
client samples CLS, FCP, INP, LCP and TTFB and sends only metric values, rating,
coarse route/device classes and a bounded release label to a same-origin
endpoint. It never sends a URL, query string, visitor identifier, content or
form value. Production reporting requires an owned retention window and an
edge rate limit. Product conclusions use a rolling 28-day window and are marked
insufficient until a route cohort contains at least 200 eligible samples.

HSTS assumes production traffic is HTTPS-terminated at the deployment edge.
The CSP report route is diagnostic and should receive an edge rate limit in the
deployment platform. Runtime exception/RUM vendor selection, alert delivery,
and post-launch 28/30-day objectives require production ownership and are not
silently simulated in this repository.
