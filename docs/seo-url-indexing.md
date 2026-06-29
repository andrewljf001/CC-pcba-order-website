# SEO URL And Indexing Rules

> This document is the source of truth for public URL structure, sitemap output, and search engine submission on PCBAForge. Read it before changing routes, blog publishing, canonical tags, robots rules, or sitemap code.

## Canonical URL Policy

- Public static pages must use extensionless URLs:
  - `/`
  - `/quote`
  - `/contact`
  - `/track`
  - `/blog`
  - `/shipping`
  - `/privacy`
  - `/terms`
- Static HTML files may remain in `public/` as internal templates, but public links, canonical tags, Open Graph URLs, emails, and sitemap URLs must not expose `.html`.
- Blog articles must use independent URLs: `/blog/:slug`.
- Blog articles must not use `blog-post.html?slug=...` as canonical, sitemap, Open Graph, admin preview, or front-end link targets.
- Do not create new SEO pages with query parameters as the primary URL. If a page is meant to rank independently, give it a clean path.

## Legacy Redirect Policy

- Keep `301` redirects only for legacy URLs confirmed as indexed in Google Search Console.
- As of 2026-06-29, the indexed legacy migration set is:
  - `/quote.html` -> `/quote`
  - `/contact.html` -> `/contact`
  - `/track.html` -> `/track`
  - `/blog.html` -> `/blog`
  - `/shipping.html` -> `/shipping`
  - `/privacy.html` -> `/privacy`
  - `/terms.html` -> `/terms`
  - `/blog-post.html?slug=ai-generated-pcb-dfm-functional-test-review` -> `/blog/ai-generated-pcb-dfm-functional-test-review`
  - `/blog-post.html?slug=2026-pcba-rfq-approved-alternates-inventory-windows` -> `/blog/2026-pcba-rfq-approved-alternates-inventory-windows`
  - `/blog-post.html?slug=functional-testing-pcba-worth-the-cost` -> `/blog/functional-testing-pcba-worth-the-cost`
- Do not blanket-301 every old `.html` or every old `blog-post.html?slug=...` URL unless Search Console confirms it is indexed or the business explicitly requests a wider migration.
- Private workflow pages such as `/account`, `/payment-success`, and `/gdpr-delete` are not SEO landing pages. Legacy private URLs may use temporary compatibility redirects, but they should not be added to the sitemap.

## Sitemap Rules

- `https://pcbaforge.com/sitemap.xml` must contain canonical, indexable URLs only.
- Sitemap URLs must not include `.html`.
- Sitemap URLs must not include tracking parameters or article query parameters.
- Blog sitemap entries must use `/blog/:slug`.
- Exclude admin, account, payment success, GDPR deletion, and API paths.
- After URL changes or publishing new indexable content, verify the live sitemap before submitting it:

```bash
curl -sS https://pcbaforge.com/sitemap.xml
```

Expected patterns:

```text
https://pcbaforge.com/quote
https://pcbaforge.com/blog/example-slug
```

Forbidden patterns:

```text
.html
blog-post.html?slug=
?utm=
```

## Robots And Noindex Rules

- Keep private pages out of indexing with robots rules and by excluding them from sitemap.
- Keep `/api/` and `/admin` disallowed.
- Keep both new private paths and old private `.html` paths disallowed during migration:
  - `/account`
  - `/account.html`
  - `/gdpr-delete`
  - `/gdpr-delete.html`
  - `/payment-success`
  - `/payment-success.html`

## Publishing Checklist

Before deploying URL or blog changes:

1. Confirm all internal links point to extensionless URLs.
2. Confirm page canonical tags match the public URL.
3. Confirm blog article links use `/blog/:slug`.
4. Confirm `server.js` sitemap output uses canonical URLs.
5. Confirm only Search Console indexed legacy URLs have SEO `301` redirects.
6. Run:

```bash
node --check server.js
rg -n "href=\"[^\"]*\\.html|href='[^']*\\.html|blog-post\\.html\\?slug=|\\.html\\?" public admin/index.html server.js
```

7. Deploy.
8. Verify the live sitemap no longer contains forbidden patterns.
9. Submit the live sitemap in Google Search Console and Bing/IndexNow.
10. Record submission results in `docs/indexing-log.md`.

## Search Engine Submission Notes

- Google: submit/resubmit the sitemap through Search Console sitemap submission. Do not use the deprecated Google sitemap ping endpoint.
- Bing: use IndexNow when the public key file is available, and/or Bing Webmaster sitemap submission when authenticated access is available.
- Never submit before the live production sitemap reflects the intended canonical URLs.
