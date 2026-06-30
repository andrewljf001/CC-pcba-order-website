# Indexing Log

## 2026-07-01 Sitemap Cleanup Follow-up

Site: `https://pcbaforge.com`

Issue found:

- The live sitemap had started including macOS AppleDouble files such as `https://pcbaforge.com/._index.html`.
- Public backup files such as `https://pcbaforge.com/blog.html.bak-soft404` were reachable from `public/`.
- Five published blog posts still contained legacy `.html` or `blog-post.html?slug=` links.

Actions:

- Deployed commit `1094d2c6b70607a468cd35e7fd5939759dce185d` (`Clean sitemap and public SEO files`).
- Changed sitemap generation to use the explicit canonical page allowlist only.
- Added a public-file guard for `._*`, backup/original files, and editor backup suffixes before `express.static`.
- Updated `/blog` to expose its visible page title as an `h1`.
- Updated five published article bodies to use canonical `/quote`, `/blog`, and `/blog/:slug` links.
- Moved VPS-only public junk files to `backups/public-junk-20260630122119/`.
- Removed the GitHub token from the VPS `origin` remote URL.

Live verification:

- `https://pcbaforge.com/sitemap.xml` contains canonical extensionless static URLs and `/blog/:slug` article URLs only.
- No `._*.html`, `.html`, or `blog-post.html?slug=` URLs remain in the sitemap.
- `https://pcbaforge.com/._index.html` returns `404`.
- `https://pcbaforge.com/blog.html.bak-soft404` returns `404`.
- `https://pcbaforge.com/blog` has `h1`: `Engineering Insights & Guides`.
- The tested blog article had zero legacy `.html`/`blog-post.html?slug=` links after the content update.

Note:

- `https://pcbaforge.com/fonts/dm-sans-subset.woff2` was removed from the origin and returns `404` on `127.0.0.1:3001`, but Cloudflare may continue serving the cached file until that edge object is purged or expires. The file is not referenced by `fonts.css`.

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
