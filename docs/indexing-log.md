# Indexing Log

## 2026-06-29 SEO URL Migration Sitemap Resubmission

Site: `https://pcbaforge.com`

Live sitemap verified:

- `https://pcbaforge.com/sitemap.xml`
- Verified at `2026-06-29T15:29:28Z` (`2026-06-29 23:29:28` Beijing time)
- Contains extensionless static URLs such as `/quote`, `/contact`, `/blog`
- Contains blog article URLs as `/blog/:slug`
- No `.html`, `blog-post.html?slug=`, `?slug=`, or tracking query URLs found

Deployment:

- Commit: `d42c57b650c31b2b180d8e964e9a32673abfc459`
- Message: `Standardize SEO URLs and sitemap rules`
- VPS deploy: `git pull`, `npm install`, `pm2 restart ccpcba`
- PM2 status after deploy: `ccpcba` online

Google Search Console:

- Submitted:
  - `https://pcbaforge.com/sitemap_index.xml`
  - `https://pcbaforge.com/sitemap.xml`
- API response: `HTTP 204` for both sitemap URLs
- Search Console list after submit:
  - `https://pcbaforge.com/sitemap_index.xml`
    - `lastSubmitted`: `2026-06-29T15:40:10.239Z`
    - `isPending`: `true`
    - `warnings`: `0`
    - `errors`: `0`
  - `https://pcbaforge.com/sitemap.xml`
    - `lastSubmitted`: `2026-06-29T15:40:10.918Z`
    - `isPending`: `true`
    - `warnings`: `0`
    - `errors`: `0`

Bing / IndexNow:

- Public key verified: `https://pcbaforge.com/indexnow.txt`
- Submitted via `https://api.indexnow.org/indexnow`
- Submitted URL list included:
  - `https://pcbaforge.com/sitemap.xml`
  - all canonical static URLs
  - all canonical blog URLs in sitemap
- API response: `HTTP 200`, empty body
- Traditional Bing sitemap ping check:
  - `https://www.bing.com/ping?sitemap=https%3A%2F%2Fpcbaforge.com%2Fsitemap.xml`
  - Response: `HTTP 410`
  - Action: treat traditional ping as unavailable; use IndexNow as the automated Bing submission path.

Follow-up:

- Recheck Search Console sitemap status after Google finishes pending processing.
- Recheck indexed URL canonical migration after the next Google crawl.
